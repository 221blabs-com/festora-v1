import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
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

    const { eventId } = await context.params;

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // 1. Get tickets directly assigned to user for this event
    const ownedSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .get();

    // 2. Get tickets purchased by user for this event (e.g. team member tickets)
    const purchasedSnapshot = await db.collection('tickets')
      .where('purchaserUserId', '==', userId)
      .where('eventId', '==', eventId)
      .get();

    // 3. Check orders placed by user for this event
    const ordersSnapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .get();

    const orderIds = ordersSnapshot.docs.map(doc => doc.id);
    const orderTicketDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

    if (orderIds.length > 0) {
      for (let i = 0; i < orderIds.length; i += 30) {
        const chunk = orderIds.slice(i, i + 30);
        const chunkSnap = await db.collection('tickets')
          .where('orderId', 'in', chunk)
          .get();
        orderTicketDocs.push(...chunkSnap.docs);
      }
    }

    // Merge and deduplicate by ticket ID
    const ticketMap = new Map<string, Record<string, unknown>>();
    ownedSnapshot.docs.forEach(doc => ticketMap.set(doc.id, { id: doc.id, ...doc.data() }));
    purchasedSnapshot.docs.forEach(doc => ticketMap.set(doc.id, { id: doc.id, ...doc.data() }));
    orderTicketDocs.forEach(doc => ticketMap.set(doc.id, { id: doc.id, ...doc.data() }));

    const tickets = Array.from(ticketMap.values());

    return NextResponse.json({
      success: true,
      tickets,
      count: tickets.length
    });

  } catch (error: unknown) {
    console.error("Error fetching user tickets for event:", error);
    return NextResponse.json(
      { error: `Failed to fetch tickets: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
