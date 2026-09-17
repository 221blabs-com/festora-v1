import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache } from '@/lib/cache';
import { getDeterministicTicketId } from '@/lib/ticket-id';

export async function POST(request: NextRequest) {
  try {
    const { eventId, ticketCode } = await request.json();

    if (!eventId || !ticketCode) {
      return NextResponse.json(
        { success: false, message: 'Event ID and ticket code are required' },
        { status: 400 }
      );
    }


    // First, try to find the individual ticket by ticketId (what's actually in the QR code)
    let ticketDoc = null;
    let ticketData = null;

    // Try direct ticket lookup first
    try {
      ticketDoc = await db.collection('tickets').doc(ticketCode).get();
      if (ticketDoc.exists) {
        ticketData = ticketDoc.data();

      }
    } catch (error) {
      // Direct lookup failed, will try collection search
    }

    // If not found by direct lookup, try searching tickets collection
    if (!ticketDoc || !ticketDoc.exists) {

      const ticketsSnapshot = await db
        .collection('tickets')
        .where('eventId', '==', eventId)
        .get();



      // Search through tickets to find matching ticket code
      for (const doc of ticketsSnapshot.docs) {
        const data = doc.data();


        const derivedCode = getDeterministicTicketId(doc.id, data.eventData?.title);
        const derivedTicketCode = getDeterministicTicketId(data.ticketId, data.eventData?.title);

        // Multiple ways to match the ticket code
        const matches = [
          doc.id === ticketCode,
          doc.id.toUpperCase() === ticketCode.toUpperCase(),
          data.ticketId === ticketCode,
          data.ticketId?.toUpperCase() === ticketCode.toUpperCase(),
          data.qrCodeData === ticketCode,
          derivedCode === ticketCode,
          derivedCode.toUpperCase() === ticketCode.toUpperCase(),
          derivedTicketCode === ticketCode,
          derivedTicketCode.toUpperCase() === ticketCode.toUpperCase(),
          ticketCode.includes(doc.id),
          doc.id.includes(ticketCode),
          // Match against legacy ticket formats
          ticketCode.includes(data.memberEmail?.split('@')[0] || ''),
          ticketCode.includes(data.memberName?.replace(/\s+/g, '') || ''),
          // Match exact or partial name/email from DB to Input (allows typing name to find ticket)
          data.memberName?.toLowerCase().includes(ticketCode.toLowerCase()),
          data.memberEmail?.toLowerCase().includes(ticketCode.toLowerCase())
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
          message: `No ticket found for code: ${ticketCode}. Event ID: ${eventId}`
        },
        { status: 404 }
      );
    }

    // Check if this specific member is already checked in
    if (ticketData.isCheckedIn || ticketData.checkedIn) {
      const memberName = ticketData.teamInfo?.memberName || ticketData.memberName || 'Participant';
      return NextResponse.json(
        {
          success: false,
          message: `${memberName} is already checked in`,
          participant: {
            id: ticketDoc.id,
            memberName: memberName,
            memberEmail: ticketData.teamInfo?.memberEmail || ticketData.memberEmail,
            teamName: ticketData.teamInfo?.teamName || ticketData.teamName,
            checkedIn: true,
            checkedInAt: ticketData.checkedInAt
          }
        },
        { status: 400 }
      );
    }

    // Update only this specific ticket as checked in
    await ticketDoc.ref.update({
      isCheckedIn: true,
      checkedIn: true, // Keep both for compatibility
      checkedInAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const memberName = ticketData.teamInfo?.memberName || ticketData.memberName || 'Participant';
    const memberEmail = ticketData.teamInfo?.memberEmail || ticketData.memberEmail || 'unknown@email.com';
    const teamName = ticketData.teamInfo?.teamName || ticketData.teamName || 'Individual';



    const checkedInParticipant = {
      id: ticketDoc.id,
      memberName: memberName,
      memberEmail: memberEmail,
      teamName: teamName,
      university: ticketData.teamInfo?.university || ticketData.university || 'Not specified',
      department: ticketData.teamInfo?.department || ticketData.department || 'Not specified',
      checkedIn: true,
      checkedInAt: new Date().toISOString(),
      registrationDate: ticketData.createdAt || new Date().toISOString(),
      paymentStatus: 'completed'
    };

    // Invalidate related caches so dashboard picks up the new check-in
    cache.invalidate(`stats:${eventId}`);
    cache.invalidate(`participants:${eventId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully checked in: ${memberName} (${teamName})`,
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
