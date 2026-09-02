import { NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';
import { createSlug } from '@/lib/slug-utils';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    const { organizationDetails, eventDetails } = data;

    // Basic validation
    if (!organizationDetails || !eventDetails) {
      return NextResponse.json({ error: 'Missing organization or event details payload' }, { status: 400 });
    }

    if (!organizationDetails.organizationName || !organizationDetails.contactName || !organizationDetails.email || !organizationDetails.username || !organizationDetails.password || !organizationDetails.acceptedTerms) {
      return NextResponse.json({ error: 'Missing required organization fields' }, { status: 400 });
    }

    if (!eventDetails.title || !eventDetails.startDate || !eventDetails.endDate) {
      return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 });
    }

    const requestedUsername = organizationDetails.username.toLowerCase().trim();

    // Check if username already exists in approved organizers
    const existingOrg = await adminDb.collection('organizers')
      .where('username', '==', requestedUsername)
      .limit(1)
      .get();
      
    if (!existingOrg.empty) {
      return NextResponse.json({ error: 'This Organizer Handle is already taken. Please choose another.' }, { status: 400 });
    }

    // Format the nested application document
    const application = {
      organizationName: organizationDetails.organizationName,
      contactName: organizationDetails.contactName,
      email: organizationDetails.email,
      phone: organizationDetails.phone || '',
      username: requestedUsername,
      password: organizationDetails.password, 
      eventTypes: organizationDetails.eventTypes || '',
      acceptedTerms: organizationDetails.acceptedTerms,
      
      // Store event details to be published upon approval
      eventDetails: {
        ...eventDetails,
        id: createSlug(eventDetails.title) + '-' + Math.random().toString(36).substring(2, 6),
      },

      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection('organizer_requests').add(application);

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Error submitting application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
