import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';

interface TicketData {
  isCheckedIn?: boolean;
  [key: string]: unknown;
}

interface CheckInData {
  ticketId?: string;
  checkedInAt?: unknown;
  userId?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const customOrganizer = request.headers.get('x-organizer-username');

    if ((!authHeader || !authHeader.startsWith('Bearer ')) && !customOrganizer) {
      return NextResponse.json({ error: 'No authentication provided' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    let organizerId = null;
    let isFirebaseUser = false;

    // Custom organizer header takes priority (scanner opened from organizer dashboard)
    // Only fall back to Firebase Auth when no custom organizer header is present
    if (!customOrganizer && authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        organizerId = decodedToken.uid;
        isFirebaseUser = true;
      } catch (e) {
        // Token invalid — will fail below if no customOrganizer
      }
    }

    if (!isFirebaseUser && !customOrganizer) {
       return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const eventId = request.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get event details and verify organizer owns this event
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;

    // Check authorization
    if (isFirebaseUser && eventData.organizerId !== organizerId) {
      return NextResponse.json(
        { error: 'You are not authorized to access this event data' },
        { status: 403 }
      );
    } else if (customOrganizer) {
       // Check multiple ways the organizer could own this event
       const eventOrganizerName = eventData.organizerName || eventData.organizationName || eventData.organizer?.name || '';
       
       let isAuthorized = false;
       
       // 1. Direct name match
       if (eventOrganizerName.toLowerCase().includes(customOrganizer.toLowerCase()) ||
           customOrganizer.toLowerCase().includes(eventOrganizerName.toLowerCase())) {
         isAuthorized = true;
       }
       
       // 2. Check organizers collection — does this username have this eventId assigned?
       if (!isAuthorized) {
         const orgSnapshot = await db.collection('organizers')
           .where('username', '==', customOrganizer.toLowerCase())
           .limit(1)
           .get();
         
         if (!orgSnapshot.empty) {
           const orgData = orgSnapshot.docs[0].data();
           // Check if organizer has this specific event assigned
           if (orgData.eventId === eventId) {
             isAuthorized = true;
           }
           // Also check if organizerName on the event matches the organizer's organizerName
           if (orgData.organizerName && eventOrganizerName.toLowerCase().includes(orgData.organizerName.toLowerCase())) {
             isAuthorized = true;
           }
         }
       }
                           
       if (!isAuthorized) {
          return NextResponse.json(
            { error: 'You are not authorized to access this event data' },
            { status: 403 }
          );
       }
    }

    // Check cache first for stats
    const statsCacheKey = `stats:${eventId}`;
    const cachedStats = cache.get<{
      success: boolean;
      event: unknown;
      stats: unknown;
      recentCheckIns: unknown[];
    }>(statsCacheKey);

    if (cachedStats) {
      return NextResponse.json(cachedStats);
    }

    // Get all tickets for this event
    const ticketsSnapshot = await db.collection('tickets')
      .where('eventId', '==', eventId)
      .get();

    const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TicketData[];

    // Calculate stats
    const totalTickets = tickets.length;
    const checkedInTickets = tickets.filter(ticket => ticket.isCheckedIn).length;
    const pendingTickets = totalTickets - checkedInTickets;

    // Get recent check-ins
    const recentCheckInsSnapshot = await db.collection('checkins')
      .where('eventId', '==', eventId)
      .orderBy('checkedInAt', 'desc')
      .limit(10)
      .get();

    // Batch fetch user docs instead of N+1 individual lookups
    const recentCheckIns = [];
    if (!recentCheckInsSnapshot.empty) {
      const userIds = recentCheckInsSnapshot.docs
        .map(d => (d.data() as CheckInData).userId as string)
        .filter(Boolean);

      const uniqueUserIds = [...new Set(userIds)];
      const userRefs = uniqueUserIds.map(id => db.collection('users').doc(id));
      const userDocs = userRefs.length > 0 ? await db.getAll(...userRefs) : [];

      // Build a lookup map
      const userMap = new Map<string, FirebaseFirestore.DocumentData | undefined>();
      userDocs.forEach(doc => {
        if (doc.exists) {
          userMap.set(doc.id, doc.data());
        }
      });

      for (const doc of recentCheckInsSnapshot.docs) {
        const checkInData = doc.data() as CheckInData;
        const userData = userMap.get(checkInData.userId as string);

        recentCheckIns.push({
          id: doc.id,
          ticketId: checkInData.ticketId,
          checkedInAt: checkInData.checkedInAt,
          attendee: {
            name: userData?.displayName || userData?.name || 'Unknown',
            email: userData?.email || 'Unknown'
          }
        });
      }
    }

    const responseData = {
      success: true,
      event: {
        id: eventId,
        title: eventData.title,
        date: eventData.dateTime?.startDate,
        venue: eventData.venue?.name || 'Online Event'
      },
      stats: {
        totalTickets,
        checkedInTickets,
        totalCheckedIn: checkedInTickets,
        pendingTickets,
        checkInRate: totalTickets > 0 ? Math.round((checkedInTickets / totalTickets) * 100) : 0
      },
      recentCheckIns
    };

    // Cache the result
    cache.set(statsCacheKey, responseData, CACHE_TTL.EVENT_STATS);

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error("Error fetching event stats:", error);
    return NextResponse.json(
      { error: `Failed to fetch stats: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
