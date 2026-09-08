import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  updateProfile,
  User
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Auth providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();

// User metadata interface
interface UserMetadata {
  full_name?: string;
  organization?: string;
}

// Create user profile in Firestore
const createUserProfile = async (user: User, additionalData?: UserMetadata) => {
  const userRef = doc(db, 'users', user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    const { displayName, email, uid } = user;
    const createdAt = new Date();

    try {
      await setDoc(userRef, {
        uid,
        displayName: displayName || additionalData?.full_name || '',
        email,
        organization: additionalData?.organization || '',
        createdAt,
        ...additionalData
      });
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  return userRef;
};

// Sign up with email and password
export const signUpWithEmailAndPassword = async (
  email: string,
  password: string,
  metadata?: UserMetadata
) => {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name if provided
    if (metadata?.full_name) {
      await updateProfile(user, { displayName: metadata.full_name });
    }

    // Create user profile in Firestore
    await createUserProfile(user, metadata);

    return { user, error: null };
  } catch (error: unknown) {
    return { user: null, error };
  }
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    return { user, error: null };
  } catch (error: unknown) {
    return { user: null, error };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    await createUserProfile(user);
    return { user, error: null };
  } catch (error: unknown) {
    return { user: null, error };
  }
};

// Sign in with GitHub
export const signInWithGitHub = async () => {
  try {
    const { user } = await signInWithPopup(auth, githubProvider);
    await createUserProfile(user);
    return { user, error: null };
  } catch (error: unknown) {
    return { user: null, error };
  }
};

// Sign out
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: unknown) {
    return { error };
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: unknown) {
    return { error };
  }
};

/**
 * Formats Firebase auth errors into clear, actionable user messages
 */
export function formatAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';
  const err = error as { code?: string; message?: string };
  const code = err.code || '';
  const msg = err.message || '';

  if (code === 'auth/configuration-not-found' || msg.includes('configuration-not-found')) {
    return 'Firebase Authentication is not enabled yet in your Firebase Console. Go to Firebase Console (festora-ce9ed) > Build > Authentication > Click "Get Started", and enable your Sign-in methods (Google and Email/Password).';
  }
  if (code === 'auth/operation-not-allowed' || msg.includes('operation-not-allowed')) {
    return 'This sign-in provider is disabled in Firebase Console. Go to Authentication > Sign-in method and enable it.';
  }
  if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
    return 'This domain is not authorized for OAuth. In Firebase Console, go to Authentication > Settings > Authorized domains and add localhost.';
  }
  if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing.';
  }
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Incorrect email or password. Please try again.';
  }
  if (code === 'auth/user-not-found') {
    return 'No account found with this email. Please sign up first.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email address is already in use. Please log in instead.';
  }
  return msg || 'Failed to authenticate. Please try again.';
}
