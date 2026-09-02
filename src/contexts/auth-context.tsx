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
      const token = await currentUser.getIdToken();
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
    if (user) {
      // Set a session cookie with the user's ID token
      const token = await user.getIdToken();
      document.cookie = `__session=${token}; path=/; max-age=3600; SameSite=Strict; ${location.protocol === 'https:' ? 'Secure;' : ''}`;
    } else {
      // Clear the session cookie
      document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
    }
  };

  useEffect(() => {
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);

      // Update session cookie for middleware
      await setSessionCookie(user);

      if (user) {
        // Fetch user profile when user is authenticated
        await fetchUserProfile(user);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
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
