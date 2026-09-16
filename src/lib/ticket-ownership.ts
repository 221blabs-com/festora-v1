import { auth, db } from './firebase-admin';

/**
 * Normalize an email for ownership matching (case/whitespace insensitive).
 */
export function normalizeEmail(email?: string | null): string {
  return (email || '').trim().toLowerCase();
}

/**
 * Resolve which Firebase Auth user, if any, a team/ticket member email belongs to.
 * - Matches the purchaser themself without an extra lookup.
 * - Otherwise checks Firebase Auth (source of truth for every sign-in method)
 *   for an existing account with that email.
 * Returns null when no account exists yet for that email - the ticket stays
 * "unclaimed" until that person creates an account or logs in.
 */
export async function resolveMemberUserId(
  memberEmail: string | undefined | null,
  purchaserUserId: string,
  purchaserEmail: string | undefined | null
): Promise<string | null> {
  const normalizedMember = normalizeEmail(memberEmail);
  if (!normalizedMember) return null;

  if (normalizedMember === normalizeEmail(purchaserEmail)) {
    return purchaserUserId;
  }

  try {
    const userRecord = await auth.getUserByEmail(normalizedMember);
    return userRecord.uid;
  } catch {
    return null;
  }
}

/**
 * Claim any unclaimed tickets (userId === null) whose stored claimEmail
 * matches this user's email, and assign them to this user's uid.
 * Called on login/profile fetch so a participant who creates or logs into
 * an account after their team registered still sees their own ticket(s).
 */
export async function claimTicketsForUser(userId: string, email: string | undefined | null): Promise<number> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return 0;

  const unclaimedSnapshot = await db.collection('tickets')
    .where('claimEmail', '==', normalizedEmail)
    .where('userId', '==', null)
    .get();

  if (unclaimedSnapshot.empty) return 0;

  const batch = db.batch();
  unclaimedSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { userId });
  });
  await batch.commit();

  return unclaimedSnapshot.size;
}
