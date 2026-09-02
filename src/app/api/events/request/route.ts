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

    // Save to Firestore
    await db.collection('event_requests').doc(requestId).set(requestData);

    // Send confirmation email to organizer
    await sendEventRequestConfirmationEmail({
      organizerEmail,
      organizerName,
      eventTitle,
      requestId
    });




    return NextResponse.json({
      success: true,
      message: 'Event request submitted successfully! We will review it and contact you within 24-48 hours.',
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
