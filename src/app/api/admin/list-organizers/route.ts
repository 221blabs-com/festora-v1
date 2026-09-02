import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function GET() {
  try {
    const snapshot = await db.collection('organizers').get();
    const organizers = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Optionally sort by createdAt or name
    organizers.sort((a: any, b: any) => {
      const nameA = a.organizerName || a.name || a.username || '';
      const nameB = b.organizerName || b.name || b.username || '';
      return nameA.localeCompare(nameB);
    });

    return NextResponse.json({ success: true, organizers });
  } catch (error) {
    console.error('Error fetching organizers:', error);
    return NextResponse.json({ error: 'Failed to fetch organizers' }, { status: 500 });
  }
}
