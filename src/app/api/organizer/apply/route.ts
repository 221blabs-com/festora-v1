import { NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';
import {
  hasFirebaseServiceAccountConfig,
  getFirebaseAdminConfigDiagnostics,
} from '@/lib/firebase-admin-config';
import { createSlug } from '@/lib/slug-utils';
import { sendOrganizerCredentialsEmail } from '@/lib/resend-email';
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

    const now = new Date().toISOString();
    const eventId = eventDetails.id || (createSlug(eventDetails.title) + '-' + Math.random().toString(36).substring(2, 6));
    const totalTickets = Number(eventDetails.totalTickets) || Number(eventDetails.capacity) || 100;
    const capacity = Number(eventDetails.capacity) || totalTickets;
    const price = Number(eventDetails.price ?? eventDetails.ticketPrice) || 0;
    const isPaid = price > 0;
    const currency = eventDetails.currency || 'INR';

    // Hash the organizer password for secure storage
    const hashedPassword = await bcrypt.hash(organizationDetails.password, 12);

    const batch = adminDb.batch();

    // 1. Create Organizer Document (instantly active & verified)
    const organizerRef = adminDb.collection('organizers').doc();
    const organizerData = {
      organizerName: organizationDetails.organizationName,
      username: requestedUsername,
      password: hashedPassword,
      email: organizationDetails.email,
      phone: organizationDetails.phone || '',
      contactName: organizationDetails.contactName,
      eventTypes: organizationDetails.eventTypes || '',
      eventId: eventId,
      eventTitle: eventDetails.title,
      verified: true,
      createdAt: now,
      createdBy: 'organizer_registration'
    };
    batch.set(organizerRef, organizerData);

    // 2. Create Event Document (instantly published & visible)
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
        id: organizerRef.id,
        name: organizationDetails.organizationName,
        email: organizationDetails.email,
      },
      organizationName: organizationDetails.organizationName,
      status: 'published',
      approvalStatus: 'approved',
      isPublished: true,
      totalTickets,
      capacity,
      registeredCount: 0,
      ticketsSold: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: 'organizer_registration'
    };
    // Strip undefined values before saving to Firestore
    batch.set(eventRef, JSON.parse(JSON.stringify(fullEvent)));

    // 3. Create Organizer Request Document (marked approved for audit/admin history)
    const requestRef = adminDb.collection('organizer_requests').doc();
    const cleanApplication = {
      organizationName: organizationDetails.organizationName,
      contactName: organizationDetails.contactName,
      email: organizationDetails.email,
      phone: organizationDetails.phone || '',
      username: requestedUsername,
      password: organizationDetails.password,
      eventTypes: organizationDetails.eventTypes || '',
      acceptedTerms: organizationDetails.acceptedTerms,
      eventDetails: fullEvent,
      status: 'approved',
      createdAt: now,
      updatedAt: now
    };
    batch.set(requestRef, JSON.parse(JSON.stringify(cleanApplication)));

    // Commit all three operations atomically
    await batch.commit();

    // Send confirmation and credentials email to the organizer via Resend
    if (organizationDetails.email) {
      try {
        await sendOrganizerCredentialsEmail({
          to: organizationDetails.email,
          organizerName: organizationDetails.contactName || organizationDetails.organizationName || 'Organizer',
          username: requestedUsername,
          password: organizationDetails.password,
          eventTitle: eventDetails.title,
          eventId: eventId,
          status: 'approved',
        });
      } catch (emailErr) {
        console.error('[Resend] Error sending application email:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: requestRef.id,
      eventId: eventId,
      username: requestedUsername
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
