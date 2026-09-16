import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireOrganizerOrAdmin } from '@/lib/organizer-session';

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ success: false, error: 'Username is required' }, { status: 400 });
    }

    const sessionOrError = requireOrganizerOrAdmin(request, username);
    if (sessionOrError instanceof NextResponse) return sessionOrError;

    const body = await request.json();
    const { name, subtitle, links, avatar } = body;

    const organizersRef = db.collection('organizers');
    const q = organizersRef.where('username', '==', username).limit(1);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
      return NextResponse.json({ success: false, error: 'Organizer not found' }, { status: 404 });
    }

    const docRef = querySnapshot.docs[0].ref;

    const updateData: any = { updatedAt: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (links !== undefined) updateData.links = links;
    if (avatar !== undefined) updateData.avatar = avatar;

    await docRef.update(updateData);

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Error updating organizer profile:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update profile'
    }, { status: 500 });
  }
}
