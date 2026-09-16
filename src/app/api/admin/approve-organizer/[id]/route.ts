import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';
import { sendOrganizerCredentialsEmail } from '@/lib/resend-email';
import { cache } from '@/lib/cache';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { requireSystemAdmin } from '@/lib/admin-session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = requireSystemAdmin(req);
    if (authError) return authError;

    const { action, rejectionReason } = await req.json();
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

      // Hash password for organizer storage
      const plainPassword = data?.password || 'welcome@123';
      const hashedPassword = await bcrypt.hash(plainPassword, 12);

      // Initialize a Firestore Batch for atomic operations
      const batch = adminDb.batch();

      // 2. Create the permanent Organizer profile
      const newOrgRef = adminDb.collection('organizers').doc();
      const eventId = data?.eventDetails?.id || data?.eventId || newOrgRef.id;
      const newOrganizerData = {
        id: newOrgRef.id,
        organizerName: data?.organizationName,
        username: data?.username,
        password: hashedPassword,
        email: data?.email,
        phone: data?.phone || '',
        contactName: data?.contactName,
        eventTypes: data?.eventTypes || '',
        eventId: eventId,
        eventTitle: data?.eventDetails?.title || '',
        verified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      batch.set(newOrgRef, newOrganizerData);

      // 3. Create or Publish the Event Profile
      const eventRef = adminDb.collection('events').doc(eventId);
      const existingEventDoc = await eventRef.get();

      const newEventData = {
        ...(existingEventDoc.exists ? existingEventDoc.data() : {}),
        ...(data?.eventDetails || {}),
        id: eventId,
        slug: eventId,
        organizer: {
          id: newOrgRef.id,
          name: data?.organizationName,
          email: data?.email,
          contactName: data?.contactName,
          phone: data?.phone || ''
        },
        organizationName: data?.organizationName,
        status: 'published',
        approvalStatus: 'approved',
        isPublished: true,
        updatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: 'system_admin',
      };
      batch.set(eventRef, newEventData, { merge: true });

      // 4. Mark request approved
      batch.update(applicationRef, {
        status: 'approved',
        updatedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
      });

      // Commit the batch
      await batch.commit();

      // Clear cache and revalidate paths
      try {
        cache.clear();
        revalidatePath('/');
        revalidatePath('/events');
        revalidatePath(`/events/${eventId}`);
        revalidatePath('/admin');
        revalidatePath('/organizer');
      } catch (cacheErr) {
        console.warn('Cache clearing notice:', cacheErr);
      }

      // Send credentials email to the organizer via Resend
      if (data?.email) {
        try {
          await sendOrganizerCredentialsEmail({
            to: data.email,
            organizerName: data.contactName || data.organizationName || 'Organizer',
            username: data.username,
            password: plainPassword,
            eventTitle: data.eventDetails?.title || 'Your Event',
            eventId: eventId,
            status: 'approved',
          });
        } catch (emailErr) {
          console.error('[Resend] Error sending approval email:', emailErr);
        }
      }

    } else if (action === 'reject') {

      const eventId = data?.eventDetails?.id || data?.eventId;
      const batch = adminDb.batch();

      batch.update(applicationRef, {
        status: 'rejected',
        rejectionReason: rejectionReason || '',
        updatedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
      });

      if (eventId) {
        const eventRef = adminDb.collection('events').doc(eventId);
        batch.update(eventRef, {
          status: 'rejected',
          approvalStatus: 'rejected',
          isPublished: false,
          updatedAt: new Date().toISOString()
        });
      }

      await batch.commit();

      // Send rejection notification email to the organizer
      if (data?.email) {
        try {
          await sendOrganizerCredentialsEmail({
            to: data.email,
            organizerName: data.contactName || data.organizationName || 'Organizer',
            username: data.username,
            eventTitle: data.eventDetails?.title || 'Your Event',
            eventId: eventId,
            status: 'rejected',
            rejectionReason: rejectionReason || undefined,
          });
        } catch (emailErr) {
          console.error('[Resend] Error sending rejection email:', emailErr);
        }
      }

      try {
        cache.clear();
        revalidatePath('/admin');
      } catch {}
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
