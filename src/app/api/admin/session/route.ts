import { NextRequest, NextResponse } from 'next/server';
import { createAdminSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/admin-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// Matches the admin panel's own localStorage session expiry so both
// expire together instead of the UI staying "logged in" after the cookie
// the server actually checks has already lapsed.
const SESSION_EXPIRY_HOURS = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_HOURS || '24');
const SESSION_TTL_SECONDS = SESSION_EXPIRY_HOURS * 60 * 60;

// Establishes a real, server-verifiable admin session cookie for the
// existing /admin panel login (which otherwise only checks credentials
// client-side and never proved its identity to any server route - every
// /api/admin/* route trusted every caller). Checks the same credentials the
// panel's login form already checks, so this never changes who can log in.
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

    const expectedUsername = process.env.SYSTEM_ADMIN_USERNAME || process.env.NEXT_PUBLIC_SYSTEM_ADMIN_USERNAME;
    const expectedPassword = process.env.SYSTEM_ADMIN_PASSWORD || process.env.NEXT_PUBLIC_SYSTEM_ADMIN_PASSWORD;

    if (!expectedUsername || !expectedPassword) {
      console.error('System admin credentials are not configured on the server.');
      return NextResponse.json({ error: 'Admin login is not configured on the server' }, { status: 503 });
    }

    if (username !== expectedUsername || password !== expectedPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createAdminSessionToken(username);
    const response = NextResponse.json({ success: true });
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
