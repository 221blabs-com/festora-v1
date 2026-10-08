import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

interface EventData {
  id: string;
  slug?: string;
  title?: string;
  status?: string;
  approvalStatus?: string;
  [key: string]: unknown;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json({ error: 'Event slug is required' }, { status: 400 });
    }

    const forceRefresh = request.nextUrl.searchParams.get('forceRefresh') === 'true';

    // Check cache first
    const cacheKey = `event:${slug}`;
    if (!forceRefresh) {
      const cached = cache.get<{ success: boolean; event: EventData }>(cacheKey);
      if (cached) {
        return NextResponse.json(cached, {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
          }
        });
      }
    }

    const responseHeaders = {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    };

    // 1. Direct document lookup by ID
    const directDoc = await db.collection('events').doc(slug).get();
    if (directDoc.exists) {
      const event = { id: directDoc.id, ...directDoc.data() } as EventData;
      const responseData = { success: true, event };
      cache.set(cacheKey, responseData, CACHE_TTL.EVENT_DOC);
      return NextResponse.json(responseData, { headers: responseHeaders });
    }

    // 2. Query Firestore by slug field directly
    const slugQuery = await db.collection('events').where('slug', '==', slug).limit(1).get();
    if (!slugQuery.empty) {
      const doc = slugQuery.docs[0];
      const event = { id: doc.id, ...doc.data() } as EventData;
      const responseData = { success: true, event };
      cache.set(cacheKey, responseData, CACHE_TTL.EVENT_DOC);
      return NextResponse.json(responseData, { headers: responseHeaders });
    }

    // 3. Fallback: match by title-derived slug from cached collection or fetch once
    const rawEventsKey = 'events:raw_collection';
    let rawEvents = cache.get<EventData[]>(rawEventsKey);
    if (!rawEvents) {
      const eventsSnapshot = await db.collection('events').get();
      rawEvents = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as EventData[];
      cache.set(rawEventsKey, rawEvents, CACHE_TTL.EVENTS_LIST);
    }

    const event = rawEvents.find(event => {
      if (event.slug === slug || event.id === slug) return true;
      const titleSlug = event.title
        ?.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');

      if (titleSlug === slug) return true;
      if (typeof slug === 'string' && slug.endsWith(`-${event.id}`)) return true;
      return false;
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404, headers: responseHeaders });
    }

    const responseData = { success: true, event };
    cache.set(cacheKey, responseData, CACHE_TTL.EVENT_DOC);

    return NextResponse.json(responseData, { headers: responseHeaders });

  } catch (error: unknown) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: `Failed to fetch event: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
