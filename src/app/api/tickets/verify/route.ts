import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    // Get the Firebase ID token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const organizerId = decodedToken.uid;

    const body = await request.json();
    const { ticketId, eventId } = body;

    if (!ticketId || !eventId) {
      return NextResponse.json({ error: 'Ticket ID and Event ID are required' }, { status: 400 });
    }

    // Get event details and verify organizer owns this event
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;

    // Check if the current user is the organizer of this event
    if (eventData.organizerId !== organizerId) {
      return NextResponse.json(
        { error: 'You are not authorized to verify tickets for this event' },
        { status: 403 }
      );
    }

    // Get ticket details
    const ticketDoc = await db.collection('tickets').doc(ticketId).get();
    if (!ticketDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ticket - Ticket not found',
        status: 'invalid'
      }, { status: 404 });
    }

    const ticketData = ticketDoc.data()!;

    // Verify ticket belongs to this event
    if (ticketData.eventId !== eventId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid ticket - Ticket is not for this event',
        status: 'invalid'
      }, { status: 400 });
    }

    // Check if ticket is already checked in
    if (ticketData.isCheckedIn) {
      return NextResponse.json({
        success: false,
        error: 'Ticket already used',
        status: 'already_used',
        checkedInAt: ticketData.checkedInAt,
        ticket: {
          id: ticketData.ticketId,
          ticketNumber: ticketData.ticketNumber,
          totalTickets: ticketData.totalTickets,
          userId: ticketData.userId
        }
      }, { status: 400 });
    }

    // Get user details for the ticket
    const userDoc = await db.collection('users').doc(ticketData.userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Check in the ticket
    const checkedInAt = new Date();
    await ticketDoc.ref.update({
      isCheckedIn: true,
      checkedInAt: checkedInAt,
      checkedInBy: organizerId
    });

    // Log the check-in event
    await db.collection('checkins').add({
      ticketId: ticketData.ticketId,
      eventId: eventId,
      userId: ticketData.userId,
      organizerId: organizerId,
      checkedInAt: checkedInAt,
      orderId: ticketData.orderId
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket verified successfully',
      status: 'valid',
      checkedInAt: checkedInAt,
      ticket: {
        id: ticketData.ticketId,
        ticketNumber: ticketData.ticketNumber,
        totalTickets: ticketData.totalTickets,
        orderId: ticketData.orderId,
        createdAt: ticketData.createdAt
      },
      attendee: {
        name: userData?.displayName || userData?.name || 'Unknown',
        email: userData?.email || 'Unknown',
        userId: ticketData.userId
      },
      event: {
        title: eventData.title,
        date: eventData.dateTime?.startDate
      }
    });

  } catch (error: unknown) {
    console.error("Error verifying ticket:", error);
    return NextResponse.json({
      success: false,
      error: `Failed to verify ticket: ${error instanceof Error ? error.message : String(error)}`,
      status: 'error'
    }, { status: 500 });
  }
}
