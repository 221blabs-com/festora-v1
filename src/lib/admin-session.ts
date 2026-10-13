import { NextRequest, NextResponse } from 'next/server';
import { createSignedSession, verifySignedSession } from './server-session';

export const ADMIN_SESSION_COOKIE = '__admin_session';
const PURPOSE = 'system-admin';

export interface AdminSession {
  username: string;
}

export function createAdminSessionToken(username: string): string {
  return createSignedSession(PURPOSE, { username });
}

export function verifyAdminSession(request: NextRequest): AdminSession | null {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifySignedSession<AdminSession>(PURPOSE, token);
  return session ? { username: session.username } : null;
}

/**
 * Guard for every /api/admin/* route that performs a privileged action.
 * Returns an error response to short-circuit the handler, or null when the
 * caller holds a valid admin session cookie (set by POST /api/admin/session,
 * called right after a successful login on the /admin panel).
 */
export function requireSystemAdmin(request: NextRequest): NextResponse | null {
  const session = verifyAdminSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Admin session required. Please log in again from the admin panel.' },
      { status: 401 }
    );
  }
  return null;
}
