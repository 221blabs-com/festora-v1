import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface EventData {
  id: string;
  isPublished?: boolean;
  published?: boolean;
  status?: string;
  approvalStatus?: string;
  category?: string;
  categories?: string[];
  title?: string;
  name?: string;
  description?: string;
  venue?: { name?: string } | string;
  organizer?: { name?: string } | string;
  dateTime?: { startDate?: string };
  date?: string;
  startDate?: string;
  createdAt?: string;
  ticketsSold?: number;
  registeredCount?: number;
  featured?: boolean;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort');
    const upcomingOnly = searchParams.get('upcoming') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const noCache = searchParams.get('noCache') === 'true' || request.headers.get('cache-control')?.includes('no-cache');

    const responseHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    };

    // Build a cache key from query params
    const cacheKey = `events:list:${category || 'all'}:${search || ''}:${sort || 'date'}:${upcomingOnly}:${limit}:${offset}`;
    if (!noCache) {
      const cached = cache.get<{ events: unknown[]; pagination: unknown }>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, { headers: responseHeaders });
      }
    }

    // Get all events from the collection
    const snapshot = await db.collection('events').get();

    let events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventData[];

    // Filter for published events
    events = events.filter(event => {
      const isPublished = event.isPublished === true ||
                         event.published === true ||
                         event.status === 'published' ||
                         event.status === 'active' ||
                         event.status === 'live' ||
                         event.status === 'upcoming' ||
                         event.status === 'completed' ||
                         event.approvalStatus === 'approved' ||
                         (!Object.prototype.hasOwnProperty.call(event, 'isPublished') &&
                          !Object.prototype.hasOwnProperty.call(event, 'published') &&
                          !Object.prototype.hasOwnProperty.call(event, 'status') &&
                          !Object.prototype.hasOwnProperty.call(event, 'approvalStatus'));
      return isPublished;
    });

    // Apply category filter if specified (checks both category and categories array)
    if (category && category !== 'all') {
      const catLower = category.toLowerCase();
      events = events.filter(event => {
        if (event.category && event.category.toLowerCase() === catLower) return true;
        if (Array.isArray(event.categories) && event.categories.some(c => c.toLowerCase() === catLower)) return true;
        return false;
      });
    }

    const getEventStartDate = (event: EventData): number => {
      const rawDate = event.dateTime?.startDate || event.startDate || event.date;
      if (!rawDate) return 0;
      const parsedDate = new Date(rawDate).getTime();
      return Number.isFinite(parsedDate) ? parsedDate : 0;
    };

    const getEventDate = (event: EventData): number => {
      const startDate = getEventStartDate(event);
      if (startDate) return startDate;
      if (!event.createdAt) return 0;
      const createdAt = new Date(event.createdAt).getTime();
      return Number.isFinite(createdAt) ? createdAt : 0;
    };

    if (upcomingOnly) {
      const now = Date.now();
      events = events.filter(event => {
        const eventDate = getEventStartDate(event);
        return eventDate > now;
      });
    }

    // Popularity uses the larger of registrations and sold tickets to avoid double-counting.
    if (sort === 'popular') {
      events.sort((a, b) => {
        const popularityA = Math.max(Number(a.ticketsSold) || 0, Number(a.registeredCount) || 0);
        const popularityB = Math.max(Number(b.ticketsSold) || 0, Number(b.registeredCount) || 0);
        return popularityB - popularityA || Number(b.featured) - Number(a.featured) || getEventDate(a) - getEventDate(b);
      });
    } else {
      // Keep the existing date order (newest first) for the other event views.
      events.sort((a, b) => getEventDate(b) - getEventDate(a));
    }

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      events = events.filter(event => {
        const title = event.title?.toLowerCase() || '';
        const name = event.name?.toLowerCase() || '';
        const description = event.description?.toLowerCase() || '';
        const venueName = typeof event.venue === 'object' ? event.venue?.name?.toLowerCase() || '' : (event.venue?.toLowerCase() || '');
        const organizerName = typeof event.organizer === 'object' ? event.organizer?.name?.toLowerCase() || '' : (event.organizer?.toLowerCase() || '');

        return title.includes(searchLower) ||
               name.includes(searchLower) ||
               description.includes(searchLower) ||
               venueName.includes(searchLower) ||
               organizerName.includes(searchLower);
      });
    }

    // Apply pagination
    const paginatedEvents = events.slice(offset, offset + limit);

    const responseData = {
      events: paginatedEvents,
      pagination: {
        total: events.length,
        limit,
        offset,
        hasMore: offset + paginatedEvents.length < events.length
      }
    };

    // Cache for 5 minutes
    cache.set(cacheKey, responseData, CACHE_TTL.EVENTS_LIST);

    return NextResponse.json(responseData, { headers: responseHeaders });

  } catch (error: unknown) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: `Failed to fetch events: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
