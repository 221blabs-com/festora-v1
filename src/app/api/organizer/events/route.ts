import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';

interface EventData {
  id: string;
  organizerName?: string;
  organizationName?: string;
  organizer?: { name?: string };
  startDate?: string;
  dateTime?: { startDate?: string };
  title?: string;
  status?: string;
  ticketsSold?: number;
  totalTickets?: number;
  capacity?: number;
  ticketPrice?: number;
  revenue?: number;
  venue?: unknown;
  description?: string;
  categories?: string[];
  registrationDeadline?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const organizer = request.nextUrl.searchParams.get('organizer');

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

  // Check cache first
  const cacheKey = `organizer_events:${organizer.toLowerCase()}`;
  const cached = cache.get<{ success: boolean; events: unknown[]; count: number; organizer: string }>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
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

      // 2. Query by organizerName field only if direct event ID was not found
      if (events.length === 0 && organizerData.organizerName) {
        const byOrgName = await db.collection('events')
          .where('organizerName', '==', organizerData.organizerName)
          .get();

        byOrgName.docs.forEach(doc => {
          if (!seenIds.has(doc.id)) {
            events.push({ id: doc.id, ...doc.data() } as EventData);
            seenIds.add(doc.id);
          }
        });
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

    // 4. If still nothing found, try querying by the organizer username as event ID
    if (events.length === 0) {
      const directDoc = await db.collection('events').doc(organizer).get();
      if (directDoc.exists) {
        events.push({ id: directDoc.id, ...directDoc.data() } as EventData);
      }
    }

    // Transform events
    const transformedEvents = events.map(event => {
      const eventDate = event.startDate || event.dateTime?.startDate || new Date().toISOString();
      const ticketsSold = Number(event.ticketsSold) || 0;
      const totalTickets = Number(event.totalTickets) || Number(event.capacity) || 0;
      const ticketPrice = Number(event.ticketPrice) || 0;
      const revenue = Number(event.revenue) || (ticketsSold * ticketPrice);

      return {
        id: event.id,
        title: event.title || 'Untitled Event',
        date: eventDate,
        status: event.status || 'upcoming',
        ticketsSold,
        totalTickets,
        revenue,
        ticketPrice,
        organizerName: event.organizerName || event.organizationName || organizer,
        venue: event.venue || { name: 'TBD', address: 'Location TBD' },
        description: event.description || 'Event description not available',
        categories: event.categories || ['General'],
        registrationDeadline: event.registrationDeadline || eventDate
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

    return NextResponse.json(responseData);

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
