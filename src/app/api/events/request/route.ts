import { NextRequest, NextResponse } from 'next/server';
import { sendEventRequestConfirmationEmail } from '@/lib/email-utils';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      eventTitle,
      eventDescription,
      eventDate,
      eventTime,
      venue,
      organizerName,
      organizerEmail,
      organizerPhone,
      expectedAttendees,
      ticketPrice,
      category,
      additionalInfo
    } = body;

    if (!eventTitle || !organizerEmail) {
      return NextResponse.json(
        { error: 'Event title and organizer email are required' },
        { status: 400 }
      );
    }

    // Generate unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store the request in Firestore for admin dashboard
    const requestData = {
      requestId,
      eventTitle,
      eventDescription: eventDescription || '',
      eventDate: eventDate || null,
      eventTime: eventTime || null,
      venue: venue || '',
      organizerName,
      organizerEmail,
      organizerPhone: organizerPhone || null,
      expectedAttendees: expectedAttendees || null,
      ticketPrice: ticketPrice || 0,
      category: category || 'Other',
      additionalInfo: additionalInfo || '',
      status: 'pending',
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedBy: null,
      adminNotes: ''
    };

    // Save to Firestore event_requests
    await db.collection('event_requests').doc(requestId).set(requestData);

    // Also mirror to organizer_requests so it appears on Admin Requests dashboard
    const organizerRequestRef = db.collection('organizer_requests').doc(requestId);
    await organizerRequestRef.set({
      id: requestId,
      organizationName: organizerName,
      contactName: organizerName,
      email: organizerEmail,
      phone: organizerPhone || '',
      username: organizerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
      status: 'pending',
      submittedAt: new Date().toISOString(),
      eventDetails: {
        id: requestId,
        title: eventTitle,
        description: eventDescription || '',
        startDate: eventDate,
        venue: venue || '',
        price: ticketPrice || 0,
        currency: 'INR',
        capacity: expectedAttendees || 100,
        category: category || 'Other',
        organizer: {
          name: organizerName,
          email: organizerEmail,
          phone: organizerPhone || '',
        }
      }
    });

    // 1. Send complete event request details to Admin (festora@221blabs.com)
    try {
      const { sendAdminNewEventNotificationEmail, sendOrganizerCredentialsEmail } = await import('@/lib/resend-email');
      await sendAdminNewEventNotificationEmail({
        organizer: {
          organizationName: organizerName,
          contactName: organizerName,
          email: organizerEmail,
          phone: organizerPhone || undefined,
          username: organizerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
          eventTypes: category
        },
        event: {
          id: requestId,
          title: eventTitle,
          startDate: eventDate,
          venue: venue || '',
          price: ticketPrice || 0,
          currency: 'INR',
          capacity: expectedAttendees || undefined,
          category: category || 'Other',
          description: eventDescription || ''
        },
        requestId
      });

      // 2. Send Acknowledgment Email to Organizer confirming submission is under review
      await sendOrganizerCredentialsEmail({
        to: organizerEmail,
        organizerName,
        username: organizerEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        eventTitle,
        eventId: requestId,
        status: 'submitted',
      });
    } catch (emailErr) {
      console.error('[Resend] Error sending event request emails:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Event request submitted successfully! Admin has been notified for review.',
      requestId
    });

  } catch (error: unknown) {
    console.error("Error processing event submission:", error);
    return NextResponse.json(
      { error: `Failed to process submission: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
