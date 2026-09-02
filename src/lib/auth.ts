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
