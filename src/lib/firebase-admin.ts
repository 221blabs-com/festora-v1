import { initializeApp, getApps, deleteApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';
import jwt from 'jsonwebtoken';
import {
  hasFirebaseServiceAccountConfig,
  getFirebaseAdminCredentials,
} from './firebase-admin-config';

// Automatically reload .env.local if service account credentials are not yet loaded in process.env
function ensureEnvLoaded() {
  if (!process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const dotenv = require('dotenv');
      dotenv.config({ path: '.env.local', override: true });
    } catch {
      // Ignore if dotenv is unavailable
    }
  }
}

// Support Firebase Emulator locally when enabled
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  }
}

let hasInitializedWithServiceAccount = false;

function getFirebaseAdminApp(): App {
  ensureEnvLoaded();

  const creds = getFirebaseAdminCredentials(process.env);
  const projectId = creds.projectId;
  const clientEmail = creds.clientEmail;
  const privateKey = creds.privateKey;

  const hasConfig = hasFirebaseServiceAccountConfig();
  const defaultApp = getApps().find((a) => a?.name === '[DEFAULT]');

  // If default app is already initialized with service account credentials, return it
  if (defaultApp && hasInitializedWithServiceAccount) {
    return defaultApp;
  }

  // If default app was created without credentials and we now have credentials, replace it
  if (defaultApp && hasConfig && !hasInitializedWithServiceAccount) {
    try {
      deleteApp(defaultApp);
    } catch {
      // ignore
    }
  }

  // Check again after potential deletion
  const activeDefaultApp = getApps().find((a) => a?.name === '[DEFAULT]');
  if (activeDefaultApp) {
    return activeDefaultApp;
  }

  try {
    if (hasConfig) {
      try {
        const app = initializeApp({
          credential: cert({
            projectId: projectId!,
            clientEmail: clientEmail!,
            privateKey: privateKey!,
          }),
          projectId,
          databaseURL: projectId ? `https://${projectId}-default-rtdb.firebaseio.com/` : undefined,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        });
        hasInitializedWithServiceAccount = true;
        return app;
      } catch (certError) {
        console.warn('Failed to initialize with provided service account credentials, falling back:', certError);
      }
    }

    console.warn('Firebase Admin SDK service account config missing or unparseable; initializing with default application credentials only.');
    const app = initializeApp({
      projectId: projectId || undefined,
      databaseURL: projectId ? `https://${projectId}-default-rtdb.firebaseio.com/` : undefined,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK default app:', error);
    const fallback = getApps().find((a) => a?.name === '[DEFAULT]');
    if (fallback) return fallback;
    throw error;
  }
}

let cachedCerts: { [key: string]: string } | null = null;
let certsExpiry = 0;

async function getGooglePublicCerts(): Promise<{ [key: string]: string }> {
  const now = Date.now();
  if (cachedCerts && now < certsExpiry) {
    return cachedCerts;
  }
  const res = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch Google public certs: ${res.statusText}`);
  }
  cachedCerts = (await res.json()) as { [key: string]: string };
  certsExpiry = now + 6 * 60 * 60 * 1000; // Cache 6 hours
  return cachedCerts;
}

async function verifyTokenWithGooglePublicKeys(
  idToken: string,
  expectedAudience: string
): Promise<DecodedIdToken> {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header?.kid) {
    throw new Error('Invalid Firebase token structure');
  }
  const certs = await getGooglePublicCerts();
  const matchedCert = certs[decoded.header.kid];
  if (!matchedCert) {
    throw new Error(`No matching Google public key found for kid: ${decoded.header.kid}`);
  }
  const verified = jwt.verify(idToken, matchedCert, {
    algorithms: ['RS256'],
    audience: expectedAudience,
    issuer: `https://securetoken.google.com/${expectedAudience}`,
  }) as DecodedIdToken;

  verified.uid = verified.uid || verified.sub || (verified as any).user_id || '';
  verified.firebase = verified.firebase || { identities: {}, sign_in_provider: 'custom' };

  return verified;
}

/**
 * Robust, cross-project ID token verification.
 * Seamlessly verifies tokens issued by the client project (e.g. festora-ce9ed)
 * even when the server Admin SDK is authenticated with a service account for another project (e.g. heartfund-cf797).
 */
export async function verifyIdTokenSafe(
  idToken: string,
  checkRevoked = false
): Promise<DecodedIdToken> {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('No ID token provided');
  }

  // Inspect the unverified token payload to find its target project audience
  const decodedUnverified = jwt.decode(idToken, { complete: true }) as {
    header: { kid: string; alg: string };
    payload: DecodedIdToken & { aud: string };
  } | null;

  const tokenAudience = decodedUnverified?.payload?.aud;
  const defaultApp = getFirebaseAdminApp();
  const defaultProjectId = defaultApp.options.projectId;

  // 1. If audience matches the default admin app project, verify via default app
  if (tokenAudience && defaultProjectId && tokenAudience === defaultProjectId) {
    try {
      return await getAuth(defaultApp).verifyIdToken(idToken, checkRevoked);
    } catch (err) {
      console.warn('Default admin app verifyIdToken failed, attempting fallback verification:', err);
    }
  }

  // 2. If audience is for a different project (e.g. festora-ce9ed, festora-221blabsdotcom)
  if (tokenAudience) {
    try {
      let appForAud = getApps().find((a) => a?.name === tokenAudience);
      if (!appForAud) {
        appForAud = initializeApp({ projectId: tokenAudience }, tokenAudience);
      }
      return await getAuth(appForAud).verifyIdToken(idToken, checkRevoked);
    } catch (err: any) {
      console.warn(`Project-specific admin app verification for ${tokenAudience} failed:`, err?.message);
    }

    // 3. Direct verification with Google's public certificates
    try {
      return await verifyTokenWithGooglePublicKeys(idToken, tokenAudience);
    } catch (err: any) {
      console.warn('Google public key verification failed:', err?.message);
    }
  }

  // 4. Last fallback: try the default app
  return await getAuth(defaultApp).verifyIdToken(idToken, checkRevoked);
}

function getFirestoreInstance(): Firestore {
  const defaultApp = getFirebaseAdminApp();
  const firestore = getFirestore(defaultApp);
  try {
    firestore.settings({
      ignoreUndefinedProperties: true,
    });
  } catch {
    // ignore if already set
  }
  return firestore;
}

// Transparent Proxy that guarantees Firestore is initialized with the latest credentials
const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getFirestoreInstance();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

export { db };
export const storage = new Proxy({} as Storage, {
  get(_target, prop) {
    const defaultApp = getFirebaseAdminApp();
    const instance = getStorage(defaultApp);
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    if (prop === 'verifyIdToken') {
      return verifyIdTokenSafe;
    }
    const defaultApp = getFirebaseAdminApp();
    const instance = getAuth(defaultApp);
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});
