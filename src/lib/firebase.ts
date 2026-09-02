// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'heartfund-cf797.firebaseapp.com',
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'https://heartfund-cf797-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'heartfund-cf797',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'heartfund-cf797.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '112363029723',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:112363029723:web:b5a15620153644b26ff8fe',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-C3CLDW034V',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Connect to Firebase Emulators in development when enabled
// Set NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true in .env.local to enable
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator && typeof window !== 'undefined') {
  try {
    // Connect to emulators (with protection against double connection)
    // @ts-expect-error - checking internal emulator config property
    if (!auth.config?.emulator) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    }

    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
    } catch {
      // Ignore likely "already connected" error
    }

    if (!(functions as unknown as Record<string, unknown>).customDomain) {
      connectFunctionsEmulator(functions, "localhost", 5001);
    }

    console.log("Connected to Firebase Emulators");
  } catch (e) {
    console.warn("Failed to connect to emulators", e);
  }
}

// Analytics only works in the browser
export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) analytics = getAnalytics(app);
  });
}

export default app;
