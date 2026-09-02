import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';

interface EventData {
  id: string;
  title?: string;
  status?: string;
  approvalStatus?: string;
  [key: string]: unknown;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;

    if (!slug) {
      return NextResponse.json({ error: 'Event slug is required' }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `event:${slug}`;
    const cached = cache.get<{ success: boolean; event: EventData }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Optimization: Try direct document lookup by ID first (1 read instead of N)
    const directDoc = await db.collection('events').doc(slug).get();
    if (directDoc.exists) {
      const event = { id: directDoc.id, ...directDoc.data() } as EventData;
      const responseData = { success: true, event };
      cache.set(cacheKey, responseData, CACHE_TTL.EVENT_DOC);
      return NextResponse.json(responseData);
    }

    // Fallback: search by slug (title-based) — only if direct ID lookup failed
    const eventsSnapshot = await db.collection('events').get();

    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventData[];

    const event = events.find(event => {
      const eventSlug = event.title
        ?.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');

      return eventSlug === slug;
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const responseData = { success: true, event };
    cache.set(cacheKey, responseData, CACHE_TTL.EVENT_DOC);

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error("Error fetching event:", error);
    return NextResponse.json(
      { error: `Failed to fetch event: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
