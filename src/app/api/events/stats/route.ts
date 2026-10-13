import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { cache, CACHE_TTL } from '@/lib/cache';
import { verifyOrganizerSession, verifyOrganizerOwnsEvent } from '@/lib/organizer-session';

interface TicketData {
  id: string;
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
    const eventId = request.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Get event details and verify the caller owns it
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;

    // Two legitimate caller types: a Firebase-authenticated organizer whose
    // uid matches event.organizerId, or a signed organizer-session cookie
    // (set by /api/auth/organizer-login) whose session we can actually
    // verify ownership for — never a client-supplied username header, which
    // anyone could set to any value.
    let authorized = false;

    if (authHeader && authHeader.startsWith('Bearer ') && auth) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await auth.verifyIdToken(idToken);
        authorized = eventData.organizerId === decodedToken.uid;
      } catch {
        // Invalid Firebase token — fall through to the organizer-session check
      }
    }

    if (!authorized) {
      const organizerSession = verifyOrganizerSession(request);
      if (organizerSession) {
        authorized = await verifyOrganizerOwnsEvent(organizerSession.organizerId, eventId);
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'You are not authorized to access this event data' },
        { status: 403 }
      );
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

    // Calculate stats - support both isCheckedIn and checkedIn flags
    const totalTickets = tickets.length;
    const checkedInTickets = tickets.filter(ticket => ticket.isCheckedIn || (ticket as any).checkedIn).length;
    const pendingTickets = totalTickets - checkedInTickets;

    // Get recent check-ins safely without requiring composite index
    const recentCheckIns: Array<{
      id: string;
      ticketId?: unknown;
      checkedInAt?: unknown;
      attendee: {
        name: string;
        email: string;
      };
    }> = [];

    try {
      // Query checkins collection using single-field equality only (no orderBy to avoid Firestore composite index requirement)
      const checkInsSnapshot = await db.collection('checkins')
        .where('eventId', '==', eventId)
        .get();

      if (!checkInsSnapshot.empty) {
        // Sort in memory by checkedInAt descending
        const sortedDocs = checkInsSnapshot.docs.sort((a, b) => {
          const aData = a.data() as CheckInData;
          const bData = b.data() as CheckInData;
          const timeA = aData.checkedInAt && typeof (aData.checkedInAt as any).toMillis === 'function'
            ? (aData.checkedInAt as any).toMillis()
            : new Date(String(aData.checkedInAt || 0)).getTime();
          const timeB = bData.checkedInAt && typeof (bData.checkedInAt as any).toMillis === 'function'
            ? (bData.checkedInAt as any).toMillis()
            : new Date(String(bData.checkedInAt || 0)).getTime();
          return timeB - timeA;
        }).slice(0, 10);

        const userIds = sortedDocs
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

        for (const doc of sortedDocs) {
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

      // If checkins collection has no records, fallback to checked-in tickets list
      if (recentCheckIns.length === 0 && checkedInTickets > 0) {
        const checkedInList = tickets
          .filter(t => t.isCheckedIn || (t as any).checkedIn)
          .sort((a, b) => {
            const timeA = new Date(String((a as any).checkedInAt || 0)).getTime();
            const timeB = new Date(String((b as any).checkedInAt || 0)).getTime();
            return timeB - timeA;
          })
          .slice(0, 10);

        for (const ticket of checkedInList) {
          recentCheckIns.push({
            id: ticket.id,
            ticketId: (ticket as any).ticketId || ticket.id,
            checkedInAt: (ticket as any).checkedInAt || new Date().toISOString(),
            attendee: {
              name: (ticket as any).memberName || (ticket as any).attendeeDetails?.name || (ticket as any).teamInfo?.memberName || 'Attendee',
              email: (ticket as any).memberEmail || (ticket as any).attendeeDetails?.email || (ticket as any).teamInfo?.memberEmail || 'Unknown'
            }
          });
        }
      }
    } catch (checkInErr) {
      console.warn('Could not query checkins collection, falling back to tickets:', checkInErr);
      const fallbackList = tickets
        .filter(t => t.isCheckedIn || (t as any).checkedIn)
        .slice(0, 10);

      for (const ticket of fallbackList) {
        recentCheckIns.push({
          id: ticket.id,
          ticketId: (ticket as any).ticketId || ticket.id,
          checkedInAt: (ticket as any).checkedInAt || new Date().toISOString(),
          attendee: {
            name: (ticket as any).memberName || (ticket as any).attendeeDetails?.name || 'Attendee',
            email: (ticket as any).memberEmail || (ticket as any).attendeeDetails?.email || 'Unknown'
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
