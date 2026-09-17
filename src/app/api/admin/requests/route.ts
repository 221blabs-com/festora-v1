import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import type { Query, DocumentData } from 'firebase-admin/firestore';

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

    // Check if user is admin
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }

    const status = request.nextUrl.searchParams.get('status') || 'all';

    // Fetch requests based on status filter
    let query: Query<DocumentData, DocumentData> = db.collection('eventRequests');

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    const requestsSnapshot = await query.orderBy('createdAt', 'desc').get();
    const requests = requestsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      success: true,
      requests: requests,
      total: requests.length
    });

  } catch (error: unknown) {
    console.error("Error fetching admin requests:", error);
    return NextResponse.json({
      error: `Failed to fetch requests: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
