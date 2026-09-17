import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// POST to reset/create admin password
export async function POST(request: NextRequest) {
  try {
    const { masterKey, username, newPassword, email } = await request.json();

    // Master key for security - should match env variable
    const MASTER_KEY = process.env.ADMIN_MASTER_KEY || 'festora-admin-reset-2026';

    if (masterKey !== MASTER_KEY) {
      return NextResponse.json(
        { error: 'Invalid master key' },
        { status: 403 }
      );
    }

    if (!username || !newPassword) {
      return NextResponse.json(
        { error: 'Username and new password are required' },
        { status: 400 }
      );
    }

    // Update or create admin user
    await db.collection('admin_users').doc(username).set({
      password: newPassword,
      email: email || `${username}@festora.com`,
      verified: true,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: `Admin password for '${username}' has been reset successfully`
    });

  } catch (error) {
    console.error('Admin password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
