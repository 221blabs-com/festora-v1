import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache } from '@/lib/cache';
import { getDeterministicTicketId } from '@/lib/ticket-id';
import type { DayTicketPass } from '@/types/firestore';

export async function POST(request: NextRequest) {
  try {
    const { eventId, ticketCode, dayNumber, checkInDate } = await request.json();

    if (!eventId || !ticketCode) {
      return NextResponse.json(
        { success: false, message: 'Event ID and ticket code are required' },
        { status: 400 }
      );
    }

    const cleanInput = ticketCode.trim();

    // Check if the scanned ticketCode is a day-specific pass code (e.g. "TF4821-D1" or "TF4821-DAY1")
    let scannedDayNumber: number | null = null;
    let baseTicketCode = cleanInput;
    const dayMatch = cleanInput.match(/^(.+?)-D(?:AY)?(\d+)$/i);
    if (dayMatch) {
      baseTicketCode = dayMatch[1].trim();
      scannedDayNumber = parseInt(dayMatch[2], 10);
    } else if (typeof dayNumber === 'number') {
      scannedDayNumber = dayNumber;
    }

    // First, try to find the individual ticket by ticketId (what's actually in the QR code)
    let ticketDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let ticketData: any = null;

    // Try direct ticket lookup using baseTicketCode or cleanInput
    for (const lookupKey of [baseTicketCode, cleanInput]) {
      try {
        const doc = await db.collection('tickets').doc(lookupKey).get();
        if (doc.exists) {
          ticketDoc = doc;
          ticketData = doc.data();
          break;
        }
      } catch {
        // Direct lookup failed, fallback to collection query
      }
    }

    // If not found by direct lookup, search tickets collection by eventId
    if (!ticketDoc || !ticketDoc.exists) {
      const ticketsSnapshot = await db
        .collection('tickets')
        .where('eventId', '==', eventId)
        .get();

      for (const doc of ticketsSnapshot.docs) {
        const data = doc.data();
        const derivedCode = getDeterministicTicketId(doc.id, data.eventData?.title);
        const derivedTicketCode = getDeterministicTicketId(data.ticketId, data.eventData?.title);

        // Check if matching day pass exists in data.dayTickets
        const hasMatchingDayPass = Array.isArray(data.dayTickets) && data.dayTickets.some(
          (dt: DayTicketPass) =>
            dt.passCode?.toUpperCase() === cleanInput.toUpperCase() ||
            dt.qrCodeData?.toUpperCase() === cleanInput.toUpperCase()
        );

        const matches = [
          hasMatchingDayPass,
          doc.id === baseTicketCode,
          doc.id.toUpperCase() === baseTicketCode.toUpperCase(),
          data.ticketId === baseTicketCode,
          data.ticketId?.toUpperCase() === baseTicketCode.toUpperCase(),
          data.qrCodeData === baseTicketCode,
          derivedCode === baseTicketCode,
          derivedCode.toUpperCase() === baseTicketCode.toUpperCase(),
          derivedTicketCode === baseTicketCode,
          derivedTicketCode.toUpperCase() === baseTicketCode.toUpperCase(),
          cleanInput.includes(doc.id),
          doc.id.includes(cleanInput),
          cleanInput.includes(data.memberEmail?.split('@')[0] || ''),
          cleanInput.includes(data.memberName?.replace(/\s+/g, '') || ''),
          data.memberName?.toLowerCase().includes(cleanInput.toLowerCase()),
          data.memberEmail?.toLowerCase().includes(cleanInput.toLowerCase())
        ];

        if (matches.some(match => match)) {
          ticketDoc = doc;
          ticketData = data;
          break;
        }
      }
    }

    if (!ticketDoc || !ticketData) {
      return NextResponse.json(
        {
          success: false,
          status: 'INVALID QR',
          message: `No ticket found for code: ${ticketCode}. Event ID: ${eventId}`
        },
        { status: 404 }
      );
    }

    // Check if ticket belongs to this event
    if (ticketData.eventId && ticketData.eventId !== eventId) {
      return NextResponse.json(
        {
          success: false,
          status: 'INVALID QR',
          message: 'This ticket belongs to another event.'
        },
        { status: 400 }
      );
    }

    // Check if ticket or order was cancelled
    if (ticketData.isValid === false || ticketData.status === 'cancelled' || ticketData.status === 'refunded') {
      return NextResponse.json(
        {
          success: false,
          status: 'INVALID REGISTRATION',
          message: 'INVALID REGISTRATION: This ticket is cancelled or refunded.'
        },
        { status: 400 }
      );
    }

    const memberName = ticketData.teamInfo?.memberName || ticketData.memberName || 'Participant';
    const memberEmail = ticketData.teamInfo?.memberEmail || ticketData.memberEmail || 'unknown@email.com';
    const teamName = ticketData.teamInfo?.teamName || ticketData.teamName || 'Individual';

    // ============================================
    // MULTI-DAY EVENT TICKET VALIDATION & CHECK-IN
    // ============================================
    const hasDayTickets = Array.isArray(ticketData.dayTickets) && ticketData.dayTickets.length > 0;

    if (hasDayTickets) {
      // Determine target event day to check in
      const targetDayNumber = scannedDayNumber ?? (typeof dayNumber === 'number' ? dayNumber : 1);

      // Rule: Day 1 QR scanned on Day 2 -> INVALID -> "This QR code is valid only for Day 1."
      // Rule: Day 2 QR scanned on Day 1 -> INVALID -> "This QR code is valid only for Day 2."
      if (typeof dayNumber === 'number' && scannedDayNumber && scannedDayNumber !== dayNumber) {
        return NextResponse.json(
          {
            success: false,
            status: 'INVALID FOR TODAY',
            message: `This QR code is valid only for Day ${scannedDayNumber}.`,
            participant: {
              id: ticketDoc.id,
              memberName,
              memberEmail,
              teamName,
              ticketId: ticketData.ticketId || ticketDoc.id,
              assignedDay: scannedDayNumber,
              currentDay: dayNumber
            }
          },
          { status: 400 }
        );
      }

      // Find the specific day entry in dayTickets
      const dayTickets = [...ticketData.dayTickets] as DayTicketPass[];
      const dayIndex = dayTickets.findIndex(d => d.dayNumber === targetDayNumber);

      if (dayIndex === -1) {
        return NextResponse.json(
          {
            success: false,
            status: 'INVALID FOR TODAY',
            message: `This ticket does not have an entry pass for Day ${targetDayNumber}.`
          },
          { status: 400 }
        );
      }

      const currentDayTicket = dayTickets[dayIndex];

      // Rule: Same QR scanned twice on the same day -> ALREADY CHECKED IN
      if (currentDayTicket.isCheckedIn) {
        const checkedTime = currentDayTicket.checkedInAt
          ? new Date(currentDayTicket.checkedInAt as any).toLocaleTimeString()
          : 'earlier';
        return NextResponse.json(
          {
            success: false,
            status: 'ALREADY CHECKED IN',
            message: `ALREADY CHECKED IN: ${memberName} was already checked in for Day ${targetDayNumber} at ${checkedTime}.`,
            participant: {
              id: ticketDoc.id,
              memberName,
              memberEmail,
              teamName,
              ticketId: ticketData.ticketId || ticketDoc.id,
              eventDay: `Day ${targetDayNumber}`,
              checkedIn: true,
              checkedInAt: currentDayTicket.checkedInAt
            }
          },
          { status: 400 }
        );
      }

      // Mark this specific day pass as checked in
      const checkInTime = new Date().toISOString();
      dayTickets[dayIndex] = {
        ...currentDayTicket,
        isCheckedIn: true,
        checkedInAt: checkInTime,
        checkedInBy: 'Staff Scanner'
      };

      // Check if all days are now checked in
      const allDaysChecked = dayTickets.every(d => d.isCheckedIn);

      await ticketDoc.ref.update({
        dayTickets,
        isCheckedIn: allDaysChecked || ticketData.isCheckedIn,
        checkedIn: allDaysChecked || ticketData.checkedIn,
        checkedInAt: ticketData.checkedInAt || checkInTime,
        updatedAt: checkInTime
      });

      // Invalidate related caches
      cache.invalidate(`stats:${eventId}`);
      cache.invalidate(`participants:${eventId}`);

      return NextResponse.json({
        success: true,
        status: 'VALID',
        message: `VALID: Successfully checked in ${memberName} for Day ${targetDayNumber}!`,
        participant: {
          id: ticketDoc.id,
          memberName,
          memberEmail,
          teamName,
          ticketId: ticketData.ticketId || ticketDoc.id,
          eventDay: `Day ${targetDayNumber}`,
          university: ticketData.teamInfo?.university || ticketData.university || 'Not specified',
          department: ticketData.teamInfo?.department || ticketData.department || 'Not specified',
          checkedIn: true,
          checkedInAt: checkInTime,
          registrationDate: ticketData.createdAt || checkInTime,
          paymentStatus: 'completed'
        }
      });
    }

    // ============================================
    // SINGLE-DAY EVENT CHECK-IN LOGIC
    // ============================================
    if (ticketData.isCheckedIn || ticketData.checkedIn) {
      return NextResponse.json(
        {
          success: false,
          status: 'ALREADY CHECKED IN',
          message: `ALREADY CHECKED IN: ${memberName} is already checked in.`,
          participant: {
            id: ticketDoc.id,
            memberName,
            memberEmail,
            teamName,
            ticketId: ticketData.ticketId || ticketDoc.id,
            checkedIn: true,
            checkedInAt: ticketData.checkedInAt
          }
        },
        { status: 400 }
      );
    }

    // Update single-day ticket as checked in
    const checkInTime = new Date().toISOString();
    await ticketDoc.ref.update({
      isCheckedIn: true,
      checkedIn: true,
      checkedInAt: checkInTime,
      updatedAt: checkInTime
    });

    const checkedInParticipant = {
      id: ticketDoc.id,
      memberName,
      memberEmail,
      teamName,
      ticketId: ticketData.ticketId || ticketDoc.id,
      university: ticketData.teamInfo?.university || ticketData.university || 'Not specified',
      department: ticketData.teamInfo?.department || ticketData.department || 'Not specified',
      checkedIn: true,
      checkedInAt: checkInTime,
      registrationDate: ticketData.createdAt || checkInTime,
      paymentStatus: 'completed'
    };

    cache.invalidate(`stats:${eventId}`);
    cache.invalidate(`participants:${eventId}`);

    return NextResponse.json({
      success: true,
      status: 'VALID',
      message: `VALID: Successfully checked in: ${memberName} (${teamName})`,
      participant: checkedInParticipant
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during check-in' },
      { status: 500 }
    );
  }
}
