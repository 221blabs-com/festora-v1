import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sendEventApprovedEmail, sendEventRejectedEmail } from '@/lib/email-service';
import { cache } from '@/lib/cache';
import { revalidatePath } from 'next/cache';

export async function PUT(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const { eventId, updates } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const existingData = eventDoc.data() || {};
    const previousStatus = existingData.approvalStatus || existingData.status;
    const newStatus = updates.approvalStatus || updates.status;

    // Add updatedAt timestamp
    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    await eventRef.update(updateData);

    // Clear caches
    try {
      cache.clear();
      revalidatePath('/events');
      revalidatePath(`/events/${eventId}`);
      revalidatePath('/admin');
    } catch {}

    // Trigger email notifications on status transitions
    if (newStatus && newStatus !== previousStatus) {
      const organizerEmail =
        existingData.organizer?.email ||
        existingData.organizerEmail ||
        existingData.contactEmail;
      const organizerName =
        existingData.organizer?.contactName ||
        existingData.organizer?.name ||
        existingData.organizerName ||
        existingData.organizationName ||
        'Organizer';
      const eventTitle = existingData.title || existingData.eventTitle || 'Your Event';

      if (organizerEmail) {
        if (newStatus === 'approved' || newStatus === 'published') {
          sendEventApprovedEmail({
            organizerEmail,
            organizerName,
            eventTitle,
            eventId,
          }).catch(err => console.error('[Email] Failed to send approval email:', err));
        } else if (newStatus === 'rejected') {
          const rejectionReason = updates.rejectionReason || updates.adminNotes || '';
          sendEventRejectedEmail({
            organizerEmail,
            organizerName,
            eventTitle,
            eventId,
            rejectionReason,
          }).catch(err => console.error('[Email] Failed to send rejection email:', err));
        }
      }
    }

    const updatedDoc = await eventRef.get();

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      event: { id: updatedDoc.id, ...updatedDoc.data() }
    });

  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await eventRef.delete();

    try {
      cache.clear();
      revalidatePath('/events');
      revalidatePath('/admin');
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}