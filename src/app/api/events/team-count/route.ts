import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

interface OrderData {
  quantity?: number;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Query only completed orders for this event
    const ordersSnap = await db
      .collection('orders')
      .where('eventId', '==', eventId)
      .where('status', '==', 'completed')
      .get();

    const teamCount = ordersSnap.size;

    // Sum quantities for participant count
    let participantsCount = 0;
    ordersSnap.forEach((doc) => {
      const data = doc.data() as OrderData;
      const qty = typeof data.quantity === 'number' ? data.quantity : 0;
      participantsCount += qty;
    });

    return NextResponse.json({
      success: true,
      eventId,
      teamCount,
      participantsCount,
    });

  } catch (error: unknown) {
    console.error('Error computing team count:', error);
    return NextResponse.json(
      { error: `Failed to compute team count: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
