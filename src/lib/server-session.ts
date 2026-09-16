import crypto from 'crypto';

/**
 * Generic signed, expiring session token helper (HMAC-SHA256, not a JWT
 * library dependency). Used to issue lightweight server-verifiable sessions
 * for the system admin panel and the organizer dashboard, neither of which
 * use Firebase Auth.
 *
 * The signing secret is namespaced per "purpose" so a token minted for one
 * use (e.g. admin) can never be replayed as a token for another (e.g.
 * organizer), even though both may fall back to the same base secret.
 */

function getBaseSecret(): string {
  // Prefer a dedicated secret if the deployment has one configured.
  const dedicated = process.env.SESSION_SIGNING_SECRET;
  if (dedicated) return dedicated;

  // Fall back to the Firebase Admin private key: it's already required
  // server-only secret material for this app to function at all, so this
  // gives every deployment a real, stable (never client-exposed) secret
  // with zero extra configuration.
  const firebaseKey = process.env.FIREBASE_PRIVATE_KEY;
  if (firebaseKey) return firebaseKey;

  throw new Error(
    'No secret material available to sign sessions. Set SESSION_SIGNING_SECRET (recommended) or FIREBASE_PRIVATE_KEY.'
  );
}

function getSigningKey(purpose: string): Buffer {
  return crypto.createHmac('sha256', getBaseSecret()).update(purpose).digest();
}

export function createSignedSession(
  purpose: string,
  payload: Record<string, unknown>,
  ttlSeconds = 8 * 60 * 60
): string {
  const exp = Date.now() + ttlSeconds * 1000;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', getSigningKey(purpose)).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySignedSession<T = Record<string, unknown>>(
  purpose: string,
  token: string | undefined | null
): (T & { exp: number }) | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  try {
    const expectedSig = crypto.createHmac('sha256', getSigningKey(purpose)).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
