import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';

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

    const eventId = request.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    // Check if user has tickets for this specific event
    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .limit(1)
      .get();

    const hasTickets = !ticketsSnapshot.empty;

    return NextResponse.json({
      success: true,
      hasTickets,
      count: ticketsSnapshot.size
    });

  } catch (error: unknown) {
    console.error("Error checking user tickets:", error);
    return NextResponse.json(
      { error: `Failed to check tickets: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
