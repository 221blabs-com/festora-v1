import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import bcrypt from 'bcryptjs';
import { createAdminSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/admin-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Matches the admin panel's own localStorage session expiry so both
// expire together instead of the UI staying "logged in" after the cookie
// the server actually checks has already lapsed.
const SESSION_EXPIRY_HOURS = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_HOURS || '24');
const SESSION_TTL_SECONDS = SESSION_EXPIRY_HOURS * 60 * 60;

// Establishes a real, server-verifiable admin session cookie for the
// /admin panel login. Validates against the admin_users Firestore
// collection (bcrypt-hashed passwords, doc ID = username) rather than a
// single shared SYSTEM_ADMIN_USERNAME/PASSWORD pair - that let every admin
// share one guessable username ("admin") and one password that also had to
// be duplicated into a NEXT_PUBLIC_ env var at one point, which Next.js
// ships into the public JS bundle. Firestore-backed accounts can be added,
// revoked, or individually rotated without redeploying or touching env
// vars; see scripts/seed-admin-user.mjs to create the first one.
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`admin-session:${ip}`, 5);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (!db) {
      console.error('Firebase Admin not initialized.');
      return NextResponse.json({ error: 'Admin login is not configured on the server' }, { status: 503 });
    }

    const normalizedUsername = String(username).trim().toLowerCase();
    const adminDoc = await db.collection('admin_users').doc(normalizedUsername).get();

    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const adminData = adminDoc.data()!;

    if (adminData.verified === false) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const storedPassword: string = adminData.password || '';
    let isPasswordValid: boolean;

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      isPasswordValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Legacy plaintext password (shouldn't exist for new accounts, kept
      // only so an old admin_users doc isn't silently locked out) -
      // compare directly, then auto-migrate to a bcrypt hash.
      isPasswordValid = Boolean(storedPassword) && storedPassword === password;
      if (isPasswordValid) {
        await adminDoc.ref.update({ password: await bcrypt.hash(password, 12) });
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createAdminSessionToken(normalizedUsername);
    const response = NextResponse.json({
      success: true,
      adminName: adminData.name || adminData.email?.split('@')[0] || normalizedUsername,
    });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error('Admin session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
