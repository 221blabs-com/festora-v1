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

    // Save to Firebase
    const docRef = await db.collection('event_requests').add(eventRequest);




    return NextResponse.json({
      success: true,
      requestId: docRef.id,
      message: 'Event request submitted successfully'
    });

  } catch (error) {
    console.error('Error creating event request:', error);
    return NextResponse.json(
      { error: 'Failed to submit event request' },
      { status: 500 }
    );
  }
}
