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

    // Get user's tickets for this specific event
    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .get();

    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

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
