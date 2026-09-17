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

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      // If no profile exists, return basic info from Firebase Auth
      return NextResponse.json({
        success: true,
        profile: {
          userId,
          email: decodedToken.email,
          displayName: decodedToken.name || '',
          createdAt: new Date().toISOString()
        }
      });
    }

    const profileData = userDoc.data();

    return NextResponse.json({
      success: true,
      profile: {
        userId,
        ...profileData
      }
    });

  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({
      error: `Failed to fetch profile: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const profileData = await request.json();

    if (!profileData) {
      return NextResponse.json({ error: 'Profile data is required' }, { status: 400 });
    }

    // Add user ID and timestamps to profile data
    const completeProfileData = {
      ...profileData,
      userId,
      updatedAt: new Date().toISOString(),
      createdAt: profileData.createdAt || new Date().toISOString()
    };

    // Save or update user profile in Firestore
    await db.collection('users').doc(userId).set(completeProfileData, { merge: true });

    return NextResponse.json({
      success: true,
      message: 'Profile saved successfully',
      userId: userId
    });

  } catch (error: unknown) {
    console.error("Error saving user profile:", error);
    return NextResponse.json({
      error: `API error: ${error instanceof Error ? error.message : String(error)}`
    }, { status: 500 });
  }
}
