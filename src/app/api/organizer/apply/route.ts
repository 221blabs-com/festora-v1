import { NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';
import {
  hasFirebaseServiceAccountConfig,
  getFirebaseAdminConfigDiagnostics,
} from '@/lib/firebase-admin-config';
import { createSlug } from '@/lib/slug-utils';
import { sendOrganizerCredentialsEmail, sendAdminNewEventNotificationEmail } from '@/lib/resend-email';
import bcrypt from 'bcryptjs';

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

    // Guard for missing Admin credentials in development / production
    if (!hasFirebaseServiceAccountConfig() && !process.env.FIRESTORE_EMULATOR_HOST) {
      const diag = getFirebaseAdminConfigDiagnostics();
      console.error('Firebase Admin credentials missing when submitting organizer application', diag);
      const missingList = diag.missing.join(', ');
      return NextResponse.json({
        error: `Firebase Admin credentials missing or incomplete on server (Missing: ${missingList || 'Invalid key'}). Please configure ${missingList || 'FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY'} in Vercel Project Settings > Environment Variables for the Production environment and trigger a redeploy.`,
        diagnostics: diag
      }, { status: 500 });
    }

    // Check if username already exists in approved organizers
    const existingOrg = await adminDb.collection('organizers')
      .where('username', '==', requestedUsername)
      .limit(1)
      .get();
      
    if (!existingOrg.empty) {
      return NextResponse.json({ error: 'This Organizer Handle is already taken. Please choose another.' }, { status: 400 });
    }

    // Check if username already has a pending application
    const existingPending = await adminDb.collection('organizer_requests')
      .where('username', '==', requestedUsername)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingPending.empty) {
      return NextResponse.json({ error: 'An application with this Organizer Handle is already pending admin review.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const eventId = eventDetails.id || (createSlug(eventDetails.title) + '-' + Math.random().toString(36).substring(2, 6));
    const totalTickets = Number(eventDetails.totalTickets) || Number(eventDetails.capacity) || 100;
    const capacity = Number(eventDetails.capacity) || totalTickets;
    const price = Number(eventDetails.price ?? eventDetails.ticketPrice) || 0;
    const isPaid = price > 0;
    const currency = eventDetails.currency || 'INR';

    const batch = adminDb.batch();

    // 1. Create Pending Event Document (unpublished until admin approves)
    const eventRef = adminDb.collection('events').doc(eventId);
    const fullEvent = {
      ...eventDetails,
      id: eventId,
      slug: eventId,
      price,
      ticketPrice: price,
      isPaid,
      currency,
      organizer: {
        id: requestedUsername,
        name: organizationDetails.organizationName,
        email: organizationDetails.email,
        contactName: organizationDetails.contactName,
        phone: organizationDetails.phone || ''
      },
      organizationName: organizationDetails.organizationName,
      status: 'pending',
      approvalStatus: 'pending',
      isPublished: false,
      totalTickets,
      capacity,
      registeredCount: 0,
      ticketsSold: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: 'organizer_submission'
    };
    // Strip undefined values before saving to Firestore
    batch.set(eventRef, JSON.parse(JSON.stringify(fullEvent)));

    // 2. Create Organizer Request Document with status: 'pending'
    const requestRef = adminDb.collection('organizer_requests').doc();
    const cleanApplication = {
      id: requestRef.id,
      organizationName: organizationDetails.organizationName,
      contactName: organizationDetails.contactName,
      email: organizationDetails.email,
      phone: organizationDetails.phone || '',
      username: requestedUsername,
      password: organizationDetails.password, // Stored to send back on approval
      eventTypes: organizationDetails.eventTypes || '',
      acceptedTerms: organizationDetails.acceptedTerms,
      eventDetails: fullEvent,
      eventId: eventId,
      status: 'pending',
      submittedAt: now,
      createdAt: now,
      updatedAt: now
    };
    batch.set(requestRef, JSON.parse(JSON.stringify(cleanApplication)));

    // Commit both operations atomically
    await batch.commit();

    // 3. Send Email to Admin with full organizer contact details and event submission
    try {
      await sendAdminNewEventNotificationEmail({
        organizer: {
          organizationName: organizationDetails.organizationName,
          contactName: organizationDetails.contactName,
          email: organizationDetails.email,
          phone: organizationDetails.phone,
          username: requestedUsername,
          eventTypes: organizationDetails.eventTypes
        },
        event: {
          id: eventId,
          title: eventDetails.title,
          startDate: eventDetails.startDate,
          endDate: eventDetails.endDate,
          venue: typeof eventDetails.venue === 'string' ? eventDetails.venue : (eventDetails.venue?.name || eventDetails.location?.address),
          venueType: eventDetails.venueType,
          price: price,
          currency: currency,
          capacity: capacity,
          category: eventDetails.category || (eventDetails.categories && eventDetails.categories[0]),
          description: eventDetails.description
        },
        requestId: requestRef.id
      });
    } catch (adminEmailErr) {
      console.error('[Resend] Error sending admin event notification email:', adminEmailErr);
    }

    // 4. Send Acknowledgment Email to Organizer informing them it is under review
    if (organizationDetails.email) {
      try {
        await sendOrganizerCredentialsEmail({
          to: organizationDetails.email,
          organizerName: organizationDetails.contactName || organizationDetails.organizationName || 'Organizer',
          username: requestedUsername,
          password: organizationDetails.password,
          eventTitle: eventDetails.title,
          eventId: eventId,
          status: 'submitted',
        });
      } catch (emailErr) {
        console.error('[Resend] Error sending application received email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      id: requestRef.id,
      eventId: eventId,
      username: requestedUsername,
      message: 'Application and event submitted successfully. Admin has been notified for review and approval.'
    });
  } catch (error: any) {
    console.error('Error submitting application:', error);
    const message = error?.message || 'Internal server error';
    return NextResponse.json({
      error: message,
      code: error?.code,
      details: error?.details
    }, { status: 500 });
  }
}
