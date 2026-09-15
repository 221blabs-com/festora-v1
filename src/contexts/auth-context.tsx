'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signUpWithEmailAndPassword,
  signInWithEmail,
  signInWithGoogle as signInWithGoogleAuth,
  signInWithGitHub as signInWithGitHubAuth,
  signOut as signOutAuth,
  resetPassword as resetPasswordAuth
} from '@/lib/auth';
import { UserProfile } from '@/types/user';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  isProfileComplete: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signInWithGoogle: () => Promise<{ error: unknown }>;
  signInWithGitHub: () => Promise<{ error: unknown }>;
  signOut: () => Promise<{ error: unknown }>;
  resetPassword: (email: string) => Promise<{ error: unknown }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Check if user profile is complete
  const isProfileComplete = userProfile?.isProfileComplete ?? false;

  // Fetch user profile
  const fetchUserProfile = async (currentUser: User) => {
    if (!currentUser) return;

    setProfileLoading(true);
    try {
      const token = await currentUser.getIdToken().catch((err) => {
        console.warn('getIdToken network error during profile fetch:', err?.message);
        return null;
      });

      if (!token) {
        setProfileLoading(false);
        return;
      }

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
      } else {
        // Profile doesn't exist, user needs onboarding
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUserProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  // Set session cookie for middleware authentication
  const setSessionCookie = async (user: User | null) => {
    try {
      if (user) {
        // Set a session cookie with the user's ID token safely
        const token = await user.getIdToken().catch((err) => {
          console.warn('Could not refresh ID token for session cookie (offline or network error):', err?.message);
          return null;
        });

        if (token && typeof document !== 'undefined') {
          const isSecure = typeof location !== 'undefined' && location.protocol === 'https:';
          document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Strict; ${isSecure ? 'Secure;' : ''}`;
        }
      } else if (typeof document !== 'undefined') {
        // Clear the session cookie
        document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      }
    } catch (cookieErr) {
      console.warn('Error setting session cookie:', cookieErr);
    }
  };

  useEffect(() => {
    // Safety timer to prevent perpetual loading state if Firebase Auth takes too long or network is offline
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        try {
          setUser(currentUser);

          // Update session cookie for middleware safely
          await setSessionCookie(currentUser);

          if (currentUser) {
            // Fetch user profile when user is authenticated
            await fetchUserProfile(currentUser);
          } else {
            setUserProfile(null);
          }
        } catch (authErr) {
          console.warn('Error in auth state change listener:', authErr);
        } finally {
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      },
      (authError) => {
        console.warn('Firebase onAuthStateChanged error:', authError);
        clearTimeout(safetyTimer);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
    setLoading(true);
    const { error } = await signUpWithEmailAndPassword(email, password, metadata);
    setLoading(false);
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    return { error };
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await signInWithGoogleAuth();
    setLoading(false);
    return { error };
  };

  const signInWithGitHub = async () => {
    setLoading(true);
    const { error } = await signInWithGitHubAuth();
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    const { error } = await signOutAuth();
    if (!error) {
      // Clear session cookie
      document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      setUser(null);
      setUserProfile(null);
    }
    return { error };
  };

  const resetPassword = async (email: string) => {
    return await resetPasswordAuth(email);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    profileLoading,
    isProfileComplete,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    resetPassword,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
