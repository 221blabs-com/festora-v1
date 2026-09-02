import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const idToken = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(idToken);

    if (decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Token UID does not match request UID' }, { status: 403 });
    }

    // Check if user exists in the "organizers" collection
    const organizerDoc = await db.collection('organizers').doc(uid).get();

    if (!organizerDoc.exists) {
      return NextResponse.json({
        isOrganizer: false,
        error: 'Organizer not found in database'
      }, { status: 404 });
    }

    const organizerData = organizerDoc.data();

    return NextResponse.json({
      isOrganizer: true,
      organizerName: organizerData?.organizerName || organizerData?.name || organizerData?.full_name || 'Organizer',
      username: organizerData?.username || organizerData?.email || decodedToken.email,
      organization: organizerData?.organization || organizerData?.organizationName,
      permissions: organizerData?.permissions || ['read', 'write'],
      eventAccess: organizerData?.eventAccess || 'all'
    });

  } catch (error: unknown) {
    console.error('Error checking organizer permissions:', error);

    const err = error as Error & { code?: string };
    if (err.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }

    if (err.code === 'auth/invalid-id-token') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    return NextResponse.json({
      error: 'Failed to check organizer permissions',
      message: err.message
    }, { status: 500 });
  }
}
