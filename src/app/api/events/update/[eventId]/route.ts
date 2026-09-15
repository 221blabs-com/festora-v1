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
      'ticketPrice', 'price', 'originalPrice', 'currency', 'dateTime', 'startDate', 'endDate', 'date',
      'category', 'categories', 'tags', 'badges',
      'requirements', 'organizer', 'organizationName', 'organizerName', 'organizationDescription',
      'organizerLinks', 'virtualLink', 'venueType',
      'isPaid', 'featured', 'isTeamEvent', 'teamSettings', 'registrationFields', 'status', 'agenda', 'approvalStatus', 'slug'
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.startDate || updateData.endDate) {
      const start = (updateData.startDate || body.startDate) as string;
      const end = (updateData.endDate || body.endDate) as string;
      updateData.dateTime = {
        startDate: start,
        endDate: end
      };
      updateData.date = start;
    } else if (body.date) {
      updateData.date = body.date;
      if (!updateData.startDate) updateData.startDate = body.date;
    }

    if (updateData.category !== undefined) {
      const existingCats = Array.isArray(updateData.categories) ? updateData.categories : (Array.isArray(body.categories) ? body.categories : []);
      if (!existingCats.includes(updateData.category)) {
        updateData.categories = [updateData.category, ...existingCats];
      }
    } else if (Array.isArray(updateData.categories) && updateData.categories.length > 0) {
      updateData.category = updateData.categories[0];
    }

    if (updateData.price !== undefined) {
      updateData.ticketPrice = updateData.price;
      updateData.isPaid = (updateData.price as number) > 0;
    } else if (updateData.ticketPrice !== undefined) {
      updateData.price = updateData.ticketPrice;
      updateData.isPaid = (updateData.ticketPrice as number) > 0;
    }

    if (updateData.capacity !== undefined) {
      updateData.totalTickets = updateData.capacity;
    } else if (updateData.totalTickets !== undefined) {
      updateData.capacity = updateData.totalTickets;
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

    const existingData = eventDoc.data();
    const slug = (existingData?.slug as string) || (updateData.slug as string) || eventId;

    // Sync eventTitle / organizerName in the organizers collection if changed
    if (updateData.title || updateData.organizationName || updateData.organizerName) {
      try {
        const orgQuery = await db.collection('organizers')
          .where('eventId', '==', eventId)
          .get();
          
        if (!orgQuery.empty) {
          const batch = db.batch();
          orgQuery.docs.forEach(doc => {
            const orgUpdates: Record<string, unknown> = {};
            if (updateData.title) orgUpdates.eventTitle = updateData.title;
            if (updateData.organizationName) orgUpdates.organizerName = updateData.organizationName;
            batch.update(doc.ref, orgUpdates);
          });
          await batch.commit();
        }
      } catch (orgErr) {
        console.warn('Failed to sync organizer record:', orgErr);
      }
    }

    // Invalidate caches
    try {
      cache.clear(); // Clear all memory cache to ensure fresh organizer dashboard data
      
      revalidatePath('/', 'layout');
      revalidatePath(`/events/${eventId}`);
      revalidatePath(`/events/${slug}`);
      revalidatePath('/events');
      revalidatePath('/organizer');
      revalidatePath(`/organizer/events/${eventId}/edit`);
      revalidatePath('/admin');
    } catch (cacheError) {
      console.warn('Cache invalidation failed:', cacheError);
    }

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully',
      id: eventId,
      slug: slug,
      updatedFields: Object.keys(updateData)
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error: unknown) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: `Failed to update event: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
