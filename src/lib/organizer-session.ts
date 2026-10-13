import { NextRequest, NextResponse } from 'next/server';
import { db } from './firebase-admin';
import { createSignedSession, verifySignedSession } from './server-session';

export const ORGANIZER_SESSION_COOKIE = '__organizer_session';
const PURPOSE = 'organizer';

export interface OrganizerSession {
  organizerId: string;
  username: string;
}

export function createOrganizerSessionToken(organizerId: string, username: string): string {
  return createSignedSession(PURPOSE, { organizerId, username });
}

export function verifyOrganizerSession(request: NextRequest): OrganizerSession | null {
  const token = request.cookies.get(ORGANIZER_SESSION_COOKIE)?.value;
  const session = verifySignedSession<OrganizerSession>(PURPOSE, token);
  return session ? { organizerId: session.organizerId, username: session.username } : null;
}

/**
 * Guard for organizer-facing routes that perform a privileged action but
 * don't yet need to know which specific event is being touched (or check
 * that separately via verifyOrganizerOwnsEvent). Returns an error response
 * to short-circuit the handler, or null + the session when valid.
 */
export function requireOrganizerSession(
  request: NextRequest
): { session: OrganizerSession; error: null } | { session: null; error: NextResponse } {
  const session = verifyOrganizerSession(request);
  if (!session) {
    return {
      session: null,
      error: NextResponse.json(
        { error: 'Organizer session required. Please log in again.' },
        { status: 401 }
      ),
    };
  }
  return { session, error: null };
}

/**
 * Checks whether the signed-in organizer owns the given event, following
 * the same linking conventions already used by /api/organizer/events
 * (a dedicated organizers.eventId field, or the event's organizerId /
 * organizer.id pointing back at this organizer's doc).
 */
export async function verifyOrganizerOwnsEvent(
  organizerId: string,
  eventId: string
): Promise<boolean> {
  if (!db || !eventId) return false;

  const [organizerDoc, eventDoc] = await Promise.all([
    db.collection('organizers').doc(organizerId).get(),
    db.collection('events').doc(eventId).get(),
  ]);

  if (!organizerDoc.exists || !eventDoc.exists) return false;

  const organizerData = organizerDoc.data() || {};
  const eventData = eventDoc.data() || {};

  if (organizerData.eventId === eventId) return true;
  if (eventData.organizerId === organizerId) return true;
  if (eventData.organizer && typeof eventData.organizer === 'object' && eventData.organizer.id === organizerId) {
    return true;
  }

  const orgName = organizerData.organizerName || organizerData.organizationName || organizerData.name;
  if (orgName && (eventData.organizerName === orgName || eventData.organizationName === orgName)) {
    return true;
  }

  return false;
}

/**
 * Combined guard: requires a valid organizer session AND that it owns the
 * event referenced in the request. Use for any route that reads an
 * `eventId` and performs a privileged action scoped to that event.
 */
export async function requireOrganizerForEvent(
  request: NextRequest,
  eventId: string | undefined | null
): Promise<NextResponse | null> {
  const { session, error } = requireOrganizerSession(request);
  if (error) return error;

  if (!eventId) {
    return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
  }

  const owns = await verifyOrganizerOwnsEvent(session.organizerId, eventId);
  if (!owns) {
    return NextResponse.json(
      { error: 'You are not authorized to act on this event' },
      { status: 403 }
    );
  }

  return null;
}
