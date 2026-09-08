import { NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';
import { sendOrganizerCredentialsEmail } from '@/lib/resend-email';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { action } = await req.json();
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const applicationRef = adminDb.collection('organizer_requests').doc(id);
    const applicationDoc = await applicationRef.get();

    if (!applicationDoc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const data = applicationDoc.data();

    if (action === 'approve') {
      // 1. Double check username to avoid collisions
      const existingOrg = await adminDb.collection('organizers')
        .where('username', '==', data?.username)
        .limit(1)
        .get();

      if (!existingOrg.empty) {
        return NextResponse.json({ error: 'Organizer Handle already taken since application' }, { status: 400 });
      }

      // Initialize a Firestore Batch for atomic operations
      const batch = adminDb.batch();

      // 2. Create the permanent Organizer profile
      const newOrgRef = adminDb.collection('organizers').doc();
      const eventId = data?.eventDetails?.id || newOrgRef.id;
      const newOrganizerData = {
        organizerName: data?.organizationName,
        username: data?.username,
        password: data?.password, // Standard password setup
        email: data?.email,
        phone: data?.phone,
        contactName: data?.contactName,
        eventTypes: data?.eventTypes,
        eventId: eventId,
        eventTitle: data?.eventDetails?.title || '',
        verified: true,
        createdAt: new Date().toISOString(),
      };
      batch.set(newOrgRef, newOrganizerData);

      // 3. Create the Event Profile (if nested in the application)
      if (data?.eventDetails) {
        const eventRef = adminDb.collection('events').doc(data.eventDetails.id || newOrgRef.id);
        
        // Link the event to the new organizer
        const newEventData = {
          ...data.eventDetails,
          organizer: {
            id: newOrgRef.id,
            name: data?.organizationName,
            email: data?.email,
          },
          organizationName: data?.organizationName,
          status: 'published',
          approvalStatus: 'approved',
          createdAt: new Date().toISOString(),
          createdBy: 'system_admin_approval',
        };
        batch.set(eventRef, newEventData);
      }

      // 4. Mark request approved
      batch.update(applicationRef, {
        status: 'approved',
        updatedAt: new Date().toISOString()
      });

      // Commit the batch
      await batch.commit();

      // Send credentials email to the organizer via Resend
      if (data?.email) {
        try {
          await sendOrganizerCredentialsEmail({
            to: data.email,
            organizerName: data.contactName || data.organizationName || 'Organizer',
            username: data.username,
            password: data.password,
            eventTitle: data.eventDetails?.title || 'Your Event',
            eventId: eventId,
            status: 'approved',
          });
        } catch (emailErr) {
          console.error('[Resend] Error sending approval email:', emailErr);
        }
      }

    } else if (action === 'reject') {
      // Reject request
      await applicationRef.update({
        status: 'rejected',
        updatedAt: new Date().toISOString()
      });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
