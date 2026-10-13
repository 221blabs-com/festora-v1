import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireOrganizerSession } from '@/lib/organizer-session';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username) {
    return NextResponse.json({ error: 'Organizer username is required' }, { status: 400 });
  }

  const { session, error } = requireOrganizerSession(request);
  if (error) return error;
  if (session.username.toLowerCase() !== username.toLowerCase()) {
    return NextResponse.json({ error: 'You are not authorized to view this profile' }, { status: 403 });
  }

  try {
    // We expect the username to be the document ID for 'mlsc-mruh'
    // or we query by username if they have a username field.
    let doc = await db.collection('organizers').doc(username.toLowerCase()).get();

    if (!doc.exists) {
      // Try querying by username
      const snapshot = await db.collection('organizers').where('username', '==', username.toLowerCase()).limit(1).get();
      if (!snapshot.empty) {
        doc = snapshot.docs[0];
      }
    }

    if (!doc.exists) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    // Never return the password field, hashed or not - no legitimate client
    // need ever requires it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...organizerWithoutPassword } = doc.data() as Record<string, unknown>;

    return NextResponse.json({
      success: true,
      organizer: { id: doc.id, ...organizerWithoutPassword }
    });

  } catch (error: unknown) {
    console.error('Error fetching organizer profile:', error);
    return NextResponse.json({
      error: 'Failed to fetch organizer profile',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
