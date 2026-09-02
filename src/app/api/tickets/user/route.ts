import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

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

    // Fetch user's tickets from Firestore
    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .get();

    const tickets: TicketData[] = [];
    for (const doc of ticketsSnapshot.docs) {
      const ticketData = doc.data();

      // Get event details for each ticket
      let eventData = null;
      if (ticketData.eventId) {
        try {
          const eventDoc = await db.collection('events').doc(ticketData.eventId).get();
          eventData = eventDoc.exists ? { id: eventDoc.id, ...eventDoc.data() } : null;
        } catch (eventError) {
          console.warn(`Could not fetch event data for ticket ${doc.id}:`, eventError);
        }
      }

      tickets.push({
        id: doc.id,
        ...ticketData,
        eventData
      });
    }

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
