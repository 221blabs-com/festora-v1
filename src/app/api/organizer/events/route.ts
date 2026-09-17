import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface EventData {
  id: string;
  organizerName?: string;
  organizationName?: string;
  organizer?: { name?: string };
  startDate?: string;
  endDate?: string;
  dateTime?: { startDate?: string; endDate?: string };
  title?: string;
  status?: string;
  ticketsSold?: number;
  totalTickets?: number;
  capacity?: number;
  ticketPrice?: number;
  price?: number;
  currency?: string;
  revenue?: number;
  venue?: unknown;
  description?: string;
  categories?: string[];
  registrationDeadline?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const organizer = request.nextUrl.searchParams.get('organizer');
  const noCache = request.nextUrl.searchParams.get('noCache') === 'true' || request.headers.get('cache-control')?.includes('no-cache');

  if (!organizer) {
    return NextResponse.json({ error: 'Organizer name is required' }, { status: 400 });
  }

  if (!db) {
    console.error('Database connection not initialized');
    return NextResponse.json({
      success: false,
      error: 'Database service unavailable'
    }, { status: 503 });
  }

  // Check cache first (unless bypassed)
  const cacheKey = `organizer_events:${organizer.toLowerCase()}`;
  if (!noCache) {
    const cached = cache.get<{ success: boolean; events: unknown[]; count: number; organizer: string }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      });
    }
  }

  try {
    // Check if this organizer has a specific event assigned
    const organizerSnapshot = await db.collection('organizers')
      .where('username', '==', organizer.toLowerCase())
      .limit(1)
      .get();

    const events: EventData[] = [];
    const seenIds = new Set<string>();

    if (!organizerSnapshot.empty) {
      const organizerData = organizerSnapshot.docs[0].data();

      // 1. If organizer has a specific event ID, fetch that event directly (1 read)
      if (organizerData.eventId) {
        const eventDoc = await db.collection('events').doc(organizerData.eventId).get();
        if (eventDoc.exists) {
          events.push({ id: eventDoc.id, ...eventDoc.data() } as EventData);
          seenIds.add(eventDoc.id);
        }
      }

      // 2. Query by organizerName / organizationName / name if direct event ID was not found
      const orgName = organizerData.organizerName || organizerData.organizationName || organizerData.name;
      if (events.length === 0 && orgName) {
        const byOrgName = await db.collection('events')
          .where('organizerName', '==', orgName)
          .get();

        byOrgName.docs.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            events.push({ id: doc.id, ...doc.data() } as EventData);
            seenIds.add(doc.id);
          }
        });

        if (events.length === 0) {
          const byOrgName2 = await db.collection('events')
            .where('organizationName', '==', orgName)
            .get();

          byOrgName2.docs.forEach(doc => {
            if (!seenIds.has(doc.id)) {
              events.push({ id: doc.id, ...doc.data() } as EventData);
              seenIds.add(doc.id);
            }
          });
        }
      }
    }

    // 3. Query by organizerId directly only if still nothing found
    if (events.length === 0) {
      const byOrgId = await db.collection('events')
        .where('organizerId', '==', organizer.toLowerCase())
        .get();

      byOrgId.docs.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          events.push({ id: doc.id, ...doc.data() } as EventData);
          seenIds.add(doc.id);
        }
      });
    }

    // 4. Query by organizer username field directly
    if (events.length === 0) {
      const byOrganizerField = await db.collection('events')
        .where('organizer', '==', organizer.toLowerCase())
        .get();

      byOrganizerField.docs.forEach(doc => {
        if (!seenIds.has(doc.id)) {
          events.push({ id: doc.id, ...doc.data() } as EventData);
          seenIds.add(doc.id);
        }
      });
    }

    // 5. If still nothing found, try querying by the organizer username as event ID
    if (events.length === 0) {
      const directDoc = await db.collection('events').doc(organizer).get();
      if (directDoc.exists) {
        events.push({ id: directDoc.id, ...directDoc.data() } as EventData);
      }
    }

    // Transform events
    const transformedEvents = events.map(event => {
      const eventDate = event.startDate || event.dateTime?.startDate || event.date || new Date().toISOString();
      const ticketsSold = Number(event.ticketsSold) || 0;
      const totalTickets = Number(event.totalTickets) || Number(event.capacity) || 0;
      const capacity = Number(event.capacity) || totalTickets;
      const ticketPrice = Number(event.ticketPrice ?? event.price) || 0;
      const currency = (event.currency as string) || 'INR';
      const revenue = Number(event.revenue) || (ticketsSold * ticketPrice);
      const categories = Array.isArray(event.categories) && event.categories.length > 0
        ? event.categories
        : (event.category ? [event.category as string] : ['General']);
      const category = (event.category as string) || categories[0] || 'General';

      return {
        id: event.id,
        slug: (event.slug as string) || event.id,
        title: event.title || 'Untitled Event',
        date: eventDate,
        startDate: (event.startDate as string) || event.dateTime?.startDate || eventDate,
        endDate: (event.endDate as string) || event.dateTime?.endDate || '',
        status: event.status || 'upcoming',
        ticketsSold,
        totalTickets,
        capacity,
        revenue,
        ticketPrice,
        price: ticketPrice,
        currency,
        category,
        categories,
        image: (event.image as string) || (event.bannerImage as string) || (event.coverImage as string) || '',
        location: event.location || event.venue || { name: 'TBD', address: 'Location TBD' },
        organizerName: event.organizerName || event.organizationName || (event.organizer && typeof event.organizer === 'object' ? (event.organizer as { name?: string }).name : undefined) || organizer,
        venue: event.venue || event.location || { name: 'TBD', address: 'Location TBD' },
        description: event.description || 'Event description not available',
        registrationDeadline: event.registrationDeadline || eventDate,
        registrationFields: event.registrationFields || null
      };
    });

    const responseData = {
      success: true,
      events: transformedEvents,
      count: transformedEvents.length,
      organizer: organizer
    };

    // Cache the result
    cache.set(cacheKey, responseData, CACHE_TTL.ORGANIZER_EVENTS);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });

  } catch (error: unknown) {
    console.error('Error fetching organizer events:', error);
    return NextResponse.json({
      error: 'Failed to fetch events',
      message: error instanceof Error ? error.message : String(error),
      success: false,
      events: [],
      count: 0
    }, { status: 500 });
  }
}
