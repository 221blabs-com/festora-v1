import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sendOrderConfirmationEmail } from '@/lib/email-utils';
import { generateSimpleTicketId } from '@/lib/ticket-id';
import { requireSystemAdmin } from '@/lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const authError = requireSystemAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const {
      orderId,
      eventId,
      customerName,
      customerEmail,
      customerPhone,
      userId,
      amount,
      // Additional registration fields
      rollNumber,
      year,
      college,
      department,
    } = body;

    // Validate required fields
    if (!orderId || !eventId || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, eventId, customerName, customerEmail, customerPhone' },
        { status: 400 }
      );
    }

    // Check if ticket already exists for this order
    const existingTickets = await db.collection('tickets')
      .where('orderId', '==', orderId)
      .limit(1)
      .get();

    if (!existingTickets.empty) {
      return NextResponse.json(
        { error: 'Ticket already exists for this order ID' },
        { status: 409 }
      );
    }

    // Get event details
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    const eventData = eventDoc.data()!;

    // Generate simple 6-digit ticket ID (2 letters of event name + 4 digit number, e.g. "TF4821")
    let ticketId = generateSimpleTicketId(eventData.title);
    let attempts = 0;
    while (attempts < 5) {
      const checkDoc = await db.collection('tickets').doc(ticketId).get();
      if (!checkDoc.exists) break;
      ticketId = generateSimpleTicketId(eventData.title);
      attempts++;
    }
    const timestamp = new Date();

    // Create the order document (for record keeping)
    const orderData = {
      orderId,
      eventId,
      userId: userId || `manual_${Date.now()}`,
      quantity: 1,
      ticketPrice: amount ? parseFloat(amount) : eventData.price || 0,
      totalAmount: amount ? parseFloat(amount) : eventData.price || 0,
      status: 'completed',
      paymentStatus: 'completed',
      customerDetails: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        rollNumber: rollNumber || '',
        year: year || '',
        college: college || '',
        department: department || '',
      },
      createdAt: timestamp,
      paymentCompletedAt: timestamp,
      manuallyCreated: true,
      manualCreationNote: 'Created via admin manual ticket page - payment was successful but ticket generation failed',
    };

    // Create the ticket document with teamInfo structure (for compatibility with participant views)
    const ticketData = {
      ticketId,
      orderId,
      eventId,
      userId: userId || `manual_${Date.now()}`,
      qrCodeData: ticketId,
      isCheckedIn: false,
      checkedInAt: null,
      createdAt: timestamp,
      ticketNumber: 1,
      totalTickets: 1,
      customerDetails: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      // Store registration fields in teamInfo for compatibility with organizer dashboard
      teamInfo: {
        memberName: customerName,
        memberEmail: customerEmail,
        memberPhone: customerPhone,
        memberRollNumber: rollNumber || '',
        memberYear: year || '',
        memberCollege: college || '',
        memberDepartment: department || '',
        isTeamEvent: false,
        college: college || '',
        department: department || '',
      },
      // Also store at top level for backward compatibility
      rollNumber: rollNumber || '',
      year: year || '',
      college: college || '',
      department: department || '',
      paymentStatus: 'completed',
      status: 'confirmed',
      manuallyCreated: true,
    };

    // Save order and ticket to Firestore
    await db.collection('orders').doc(orderId).set(orderData);
    await db.collection('tickets').doc(ticketId).set(ticketData);

    // Update event ticketsSold count
    const currentSold = eventData.ticketsSold || 0;
    await db.collection('events').doc(eventId).update({
      ticketsSold: currentSold + 1,
    });

    // Send confirmation email with QR code
    try {
      await sendOrderConfirmationEmail({
        customerEmail,
        customerName,
        eventTitle: eventData.title,
        orderNumber: orderId,
        ticketPrice: amount ? parseFloat(amount) : eventData.price || 0,
        currency: eventData.currency || 'INR',
        eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
        eventVenue: eventData.venue?.name || eventData.venue || 'Event Venue',
        ticketCode: ticketId,
        isIndividualTicket: true,
      });


    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the whole operation if email fails
      const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
      return NextResponse.json({
        success: true,
        ticketId,
        orderId,
        warning: `Ticket created but email failed: ${errorMessage}`,
      });
    }

    return NextResponse.json({
      success: true,
      ticketId,
      orderId,
      message: 'Ticket created and confirmation email sent successfully',
    });

  } catch (error) {
    console.error('Manual ticket creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
