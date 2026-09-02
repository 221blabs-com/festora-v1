import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { organizerName, username, password, email, verified = true } = data;

    if (!organizerName || !username || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if username already exists
    const existing = await db.collection('organizers').where('username', '==', username).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const docRef = db.collection('organizers').doc(username); // Using username as ID for uniqueness/simplicity or auto ID
    
    await docRef.set({
      id: docRef.id,
      organizerName,
      username,
      password: hashedPassword,
      email: email || '',
      verified,
      createdAt: new Date().toISOString(),
      createdBy: 'system-admin'
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('Error creating organizer:', error);
    return NextResponse.json({ error: 'Failed to create organizer' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, organizerName, password, email, verified } = data;

    if (!id) {
      return NextResponse.json({ error: 'Missing organizer ID' }, { status: 400 });
    }

    const updates: any = {};
    if (organizerName !== undefined) updates.organizerName = organizerName;
    if (email !== undefined) updates.email = email;
    if (verified !== undefined) updates.verified = verified;
    
    if (password) {
      updates.password = await bcrypt.hash(password, 12);
    }

    updates.updatedAt = new Date().toISOString();

    await db.collection('organizers').doc(id).update(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating organizer:', error);
    return NextResponse.json({ error: 'Failed to update organizer' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing organizer ID' }, { status: 400 });
    }

    await db.collection('organizers').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organizer:', error);
    return NextResponse.json({ error: 'Failed to delete organizer' }, { status: 500 });
  }
}
