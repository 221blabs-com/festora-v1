import * as admin from 'firebase-admin';
import { hasFirebaseServiceAccountConfig, normalizeFirebasePrivateKey } from './firebase-admin-config';

const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
const privateKey = normalizeFirebasePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

let db: admin.firestore.Firestore;

if (!admin.apps.length) {
  try {
    if (hasFirebaseServiceAccountConfig()) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId!,
          clientEmail: clientEmail!,
          privateKey: privateKey!,
        }),
        projectId,
        databaseURL: projectId ? `https://${projectId}-default-rtdb.firebaseio.com/` : undefined,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });

      console.log('Firebase Admin SDK initialized successfully with service account');
    } else {
      console.warn('Firebase Admin SDK service account config missing; initializing with default application credentials only.');
      admin.initializeApp({
        projectId: projectId || undefined,
        databaseURL: projectId ? `https://${projectId}-default-rtdb.firebaseio.com/` : undefined,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }

    db = admin.firestore();
    db.settings({
      ignoreUndefinedProperties: true,
    });
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    db = admin.firestore();
  }
} else {
  db = admin.firestore();
}

export { db };
export const storage = admin.apps.length ? admin.storage() : null;
export const auth = admin.apps.length ? admin.auth() : null;
export default admin;
