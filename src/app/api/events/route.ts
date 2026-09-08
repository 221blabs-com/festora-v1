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
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const noCache = searchParams.get('noCache') === 'true' || request.headers.get('cache-control')?.includes('no-cache');

    const responseHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    };

    // Build a cache key from query params
    const cacheKey = `events:list:${category || 'all'}:${search || ''}:${limit}:${offset}`;
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

    // Sort events by date (newest first)
    events.sort((a, b) => {
      const getEventDate = (event: EventData): number => {
        if (event.dateTime?.startDate) return new Date(event.dateTime.startDate).getTime();
        if (event.date) return new Date(event.date).getTime();
        if (event.startDate) return new Date(event.startDate).getTime();
        if (event.createdAt) return new Date(event.createdAt).getTime();
        return 0;
      };
      return getEventDate(b) - getEventDate(a);
    });

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
