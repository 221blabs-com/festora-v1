import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { claimTicketsForUser } from '@/lib/ticket-ownership';

interface TicketData {
  id: string;
  createdAt?: unknown;
  eventId?: string;
  eventData?: unknown;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    // Get the Firebase ID token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Link any unclaimed team-registration tickets that were created against
    // this user's email before they logged in / created their account.
    try {
      await claimTicketsForUser(userId, decodedToken.email);
    } catch (claimError) {
      console.warn('Failed to claim tickets for user:', claimError);
    }

    // Fetch user's tickets from Firestore
    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .get();

    const eventCache = new Map<string, unknown>();

    const tickets: TicketData[] = await Promise.all(
      ticketsSnapshot.docs.map(async (doc) => {
        const ticketData = doc.data();
        let eventData = null;

        if (ticketData.eventId) {
          if (eventCache.has(ticketData.eventId)) {
            eventData = eventCache.get(ticketData.eventId);
          } else {
            try {
              const eventDoc = await db.collection('events').doc(ticketData.eventId).get();
              eventData = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;
              eventCache.set(ticketData.eventId, eventData);
            } catch (eventError) {
              console.warn(`Could not fetch event data for ticket ${doc.id}:`, eventError);
            }
          }
        }

        return {
          id: doc.id,
          ...ticketData,
          eventData
        };
      })
    );

    // Sort tickets by creation date (newest first)
    tickets.sort((a, b) => {
      const dateA = new Date(a.createdAt as string || 0).getTime();
      const dateB = new Date(b.createdAt as string || 0).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      tickets: tickets
    });

  } catch (error: unknown) {
    console.error("Error fetching user tickets:", error);
    return NextResponse.json(
      { error: `Failed to fetch tickets: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
