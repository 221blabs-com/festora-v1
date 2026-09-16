import { db } from './firebase-admin';

/**
 * Resolve the organizer username that owns a given event.
 *
 * Mirrors every matching strategy /api/organizer/events already uses to go
 * the other direction (organizer -> events), just inverted, so an organizer
 * whose event isn't linked via the primary `organizers.eventId` field isn't
 * wrongly locked out of their own event by a stricter check.
 */
export async function getEventOwnerUsername(eventId: string): Promise<string | null> {
  // 1. Direct link: organizers.eventId == eventId
  const direct = await db.collection('organizers').where('eventId', '==', eventId).limit(1).get();
  if (!direct.empty) {
    const username = direct.docs[0].data()?.username;
    if (typeof username === 'string' && username) return username.toLowerCase();
  }

  const eventDoc = await db.collection('events').doc(eventId).get();
  if (!eventDoc.exists) return null;
  const eventData = eventDoc.data() || {};

  // 2. events.organizerId matches an organizer's doc ID or username field
  const organizerId = eventData.organizerId;
  if (typeof organizerId === 'string' && organizerId) {
    const byId = await db.collection('organizers').doc(organizerId.toLowerCase()).get();
    if (byId.exists) {
      const username = byId.data()?.username;
      if (typeof username === 'string' && username) return username.toLowerCase();
    }
    const byIdField = await db.collection('organizers').where('username', '==', organizerId.toLowerCase()).limit(1).get();
    if (!byIdField.empty) {
      const username = byIdField.docs[0].data()?.username;
      if (typeof username === 'string' && username) return username.toLowerCase();
    }
  }

  // 3. events.organizerName / organizationName matches an organizer's name fields
  const orgName = eventData.organizerName || eventData.organizationName ||
    (eventData.organizer && typeof eventData.organizer === 'object' ? eventData.organizer.name : undefined);
  if (typeof orgName === 'string' && orgName) {
    for (const field of ['organizerName', 'organizationName', 'name']) {
      const snap = await db.collection('organizers').where(field, '==', orgName).limit(1).get();
      if (!snap.empty) {
        const username = snap.docs[0].data()?.username;
        if (typeof username === 'string' && username) return username.toLowerCase();
      }
    }
  }

  // 4. events.organizer field used directly as a username
  const organizerField = eventData.organizer;
  if (typeof organizerField === 'string' && organizerField) {
    const snap = await db.collection('organizers').where('username', '==', organizerField.toLowerCase()).limit(1).get();
    if (!snap.empty) {
      const username = snap.docs[0].data()?.username;
      if (typeof username === 'string' && username) return username.toLowerCase();
    }
  }

  // 5. The eventId itself matches an organizer's username (single-event
  // organizer accounts created with the event slug as their username)
  const byUsername = await db.collection('organizers').where('username', '==', eventId.toLowerCase()).limit(1).get();
  if (!byUsername.empty) {
    const username = byUsername.docs[0].data()?.username;
    if (typeof username === 'string' && username) return username.toLowerCase();
  }

  return null;
}
