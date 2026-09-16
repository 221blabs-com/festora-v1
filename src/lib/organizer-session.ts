import { NextRequest, NextResponse } from 'next/server';
import { createSignedSession, verifySignedSession } from './server-session';
import { verifyAdminSession } from './admin-session';

export const ORGANIZER_SESSION_COOKIE = '__organizer_session';
const PURPOSE = 'organizer';

export interface OrganizerSession {
  username: string;
}

export function createOrganizerSessionToken(username: string): string {
  return createSignedSession(PURPOSE, { username: username.toLowerCase() });
}

export function verifyOrganizerSession(request: NextRequest): OrganizerSession | null {
  const token = request.cookies.get(ORGANIZER_SESSION_COOKIE)?.value;
  const session = verifySignedSession<OrganizerSession>(PURPOSE, token);
  return session ? { username: session.username } : null;
}

/**
 * Guard for organizer-scoped routes. Requires a valid organizer session
 * cookie (set by POST /api/auth/organizer-login on success). When
 * `targetUsername` is provided, the session must belong to that exact
 * organizer - this stops one organizer from reading/editing another's data
 * by simply changing a query param, which is how these routes used to work.
 * An admin session also satisfies this check.
 */
export function requireOrganizer(request: NextRequest, targetUsername?: string): NextResponse | OrganizerSession {
  const session = verifyOrganizerSession(request);
  if (!session) {
    return NextResponse.json(
      { error: 'Organizer session required. Please log in again.' },
      { status: 401 }
    );
  }
  if (targetUsername && session.username !== targetUsername.trim().toLowerCase()) {
    return NextResponse.json(
      { error: 'Forbidden: you do not have access to this organizer account.' },
      { status: 403 }
    );
  }
  return session;
}

/**
 * Like requireOrganizer, but also accepts a valid system-admin session
 * regardless of `targetUsername` - for routes admins manage on an
 * organizer's behalf (event editing, check-in, participant lists).
 */
export function requireOrganizerOrAdmin(request: NextRequest, targetUsername?: string): NextResponse | OrganizerSession {
  if (verifyAdminSession(request)) {
    return { username: targetUsername?.trim().toLowerCase() || 'admin' };
  }
  return requireOrganizer(request, targetUsername);
}
