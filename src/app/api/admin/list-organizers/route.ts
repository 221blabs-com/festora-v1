import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireSystemAdmin } from '@/lib/admin-session';

export async function GET(request: NextRequest) {
  try {
    const authError = requireSystemAdmin(request);
    if (authError) return authError;

    const snapshot = await db.collection('organizers').get();
    const organizers = snapshot.docs.map(doc => {
      // Never expose password hashes, even to an authenticated admin caller.
      const { password: _password, ...rest } = doc.data();
      return { id: doc.id, ...rest };
    });

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
