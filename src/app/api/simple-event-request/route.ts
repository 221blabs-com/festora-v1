import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = ['eventTitle', 'organizationName', 'contactEmail', 'phoneNumber', 'eventDescription'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate phone number (Indian format: 10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(data.phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number. Please enter a valid 10-digit Indian phone number.' },
        { status: 400 }
      );
    }

    // Create the event request document
    const eventRequest = {
      eventTitle: data.eventTitle,
      organizationName: data.organizationName,
      contactEmail: data.contactEmail,
      phoneNumber: data.phoneNumber,
      eventType: data.eventType || 'conference',
      eventDescription: data.eventDescription,
      preferredDate: data.preferredDate || null,
      estimatedAttendees: data.estimatedAttendees || 50,
      additionalNotes: data.additionalNotes || '',
      userId: data.userId,
      submittedAt: data.submittedAt || new Date().toISOString(),
      status: 'pending', // For admin dashboard
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to Firebase event_requests
    const docRef = await db.collection('event_requests').add(eventRequest);
    const requestId = docRef.id;

    // Mirror to organizer_requests so admin sees it in the dashboard
    await db.collection('organizer_requests').doc(requestId).set({
      id: requestId,
      organizationName: data.organizationName,
      contactName: data.organizationName,
      email: data.contactEmail,
      phone: data.phoneNumber,
      username: data.contactEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
      status: 'pending',
      submittedAt: new Date().toISOString(),
      eventDetails: {
        id: requestId,
        title: data.eventTitle,
        description: data.eventDescription,
        startDate: data.preferredDate,
        venue: 'To be determined',
        price: 0,
        currency: 'INR',
        capacity: data.estimatedAttendees || 50,
        category: data.eventType || 'conference',
        organizer: {
          name: data.organizationName,
          email: data.contactEmail,
          phone: data.phoneNumber
        }
      }
    });

    // Send emails via Resend
    try {
      const { sendAdminNewEventNotificationEmail, sendOrganizerCredentialsEmail } = await import('@/lib/resend-email');
      
      // 1. Send complete details to admin festora@221blabs.com
      await sendAdminNewEventNotificationEmail({
        organizer: {
          organizationName: data.organizationName,
          contactName: data.organizationName,
          email: data.contactEmail,
          phone: data.phoneNumber,
          username: data.contactEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
          eventTypes: data.eventType
        },
        event: {
          id: requestId,
          title: data.eventTitle,
          startDate: data.preferredDate,
          venue: 'TBD',
          price: 0,
          capacity: data.estimatedAttendees,
          category: data.eventType,
          description: data.eventDescription
        },
        requestId
      });

      // 2. Send acknowledgment to organizer
      await sendOrganizerCredentialsEmail({
        to: data.contactEmail,
        organizerName: data.organizationName,
        username: data.contactEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
        eventTitle: data.eventTitle,
        eventId: requestId,
        status: 'submitted',
      });
    } catch (emailErr) {
      console.error('[Resend] Error sending simple event request emails:', emailErr);
    }

    return NextResponse.json({
      success: true,
      requestId,
      message: 'Event request submitted successfully. Admin has been notified for review.'
    });

  } catch (error) {
    console.error('Error creating event request:', error);
    return NextResponse.json(
      { error: 'Failed to submit event request' },
      { status: 500 }
    );
  }
}
