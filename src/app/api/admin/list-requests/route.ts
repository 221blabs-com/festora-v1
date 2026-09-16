import { NextRequest, NextResponse } from 'next/server';
import { db as adminDb } from '@/lib/firebase-admin';
import { requireSystemAdmin } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = requireSystemAdmin(request);
    if (authError) return authError;

    const snapshot = await adminDb.collection('organizer_requests')
      .where('status', '==', 'pending')
      .get();

    // These docs include an applicant's plaintext password (stored to send
    // back on approval) - never let it leave the server in a list response.
    const requests = snapshot.docs.map(doc => {
      const { password: _password, ...rest } = doc.data();
      return { id: doc.id, ...rest };
    });

    return NextResponse.json({ success: true, requests });
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
