import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache } from '@/lib/cache';
import { revalidatePath } from 'next/cache';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    const body = await request.json();

    const allowedFields = [
      'title', 'description', 'shortDescription', 'image',
      'venue', 'location', 'capacity', 'totalTickets',
      'ticketPrice', 'price', 'originalPrice', 'currency', 'dateTime', 'startDate', 'endDate', 'tags', 'categories', 'badges',
      'requirements', 'organizationName', 'organizationDescription',
      'organizerLinks', 'virtualLink', 'venueType',
      'isPaid', 'featured', 'isTeamEvent', 'teamSettings', 'status', 'agenda', 'approvalStatus'
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.startDate || updateData.endDate) {
      updateData.dateTime = {
        startDate: updateData.startDate || body.startDate,
        endDate: updateData.endDate || body.endDate
      };
    }
    if (updateData.price !== undefined) {
      updateData.ticketPrice = updateData.price;
      updateData.isPaid = (updateData.price as number) > 0;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date().toISOString();

    // Update the event in Firestore
    const eventRef = db.collection('events').doc(eventId);
    const eventDoc = await eventRef.get();

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await eventRef.update(updateData);

    // Invalidate caches
    try {
      cache.invalidatePrefix('event');
      cache.invalidatePrefix('events');
      cache.invalidatePrefix('organizer_events');
      cache.invalidatePrefix('event_stats');
      
      revalidatePath(`/events/${eventId}`);
      revalidatePath('/events');
      revalidatePath('/organizer');
      revalidatePath('/admin');
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      updatedFields: Object.keys(updateData)
    });

  } catch (error: unknown) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: `Failed to update event: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
