import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { requireSystemAdmin } from '@/lib/admin-session';

// POST to reset/create admin password
export async function POST(request: NextRequest) {
  try {
    // Require an authenticated admin session in addition to the master key
    // below - this route can create or overwrite any admin_users credential,
    // so a leaked/guessed master key alone should no longer be sufficient.
    const authError = requireSystemAdmin(request);
    if (authError) return authError;

    const { masterKey, username, newPassword, email } = await request.json();

    // Master key must be explicitly configured - no hardcoded fallback, so a
    // missing env var fails closed instead of accepting a value visible in
    // source history.
    const MASTER_KEY = process.env.ADMIN_MASTER_KEY;
    if (!MASTER_KEY) {
      console.error('ADMIN_MASTER_KEY is not configured; refusing password reset.');
      return NextResponse.json({ error: 'Password reset is not configured on the server' }, { status: 503 });
    }

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
