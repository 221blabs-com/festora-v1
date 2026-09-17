import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const snapshot = await db.collection('events').orderBy('createdAt', 'desc').get();

    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      total: events.length,
      events
    });

  } catch (error) {
    console.error('Error listing events:', error);
    return NextResponse.json({
      error: 'Failed to list events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
