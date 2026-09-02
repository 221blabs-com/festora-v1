'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { FaGoogle, FaGithub } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubComingSoon, setGithubComingSoon] = useState(false);

  const { user, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Don't render the signup form if user is authenticated
  if (user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-[family-name:var(--font-josefin)]">
        <div className="text-[var(--primary)] text-center">
          <Spinner />
          <p className="uppercase tracking-widest text-sm font-bold">Redirecting...</p>
        </div>
      </div>
    );
  }

  const handleGoogleSignUp = async () => {
   setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        throw result.error;
      }
      router.push('/dashboard');
    } catch (error) {
       if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to sign up. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>

      {/* Decorative Ornaments */}
      <div className="fixed left-0 top-0 bottom-0 w-24 border-r border-[var(--border-subtle)] hidden lg:block pointer-events-none opacity-20"></div>
      <div className="fixed right-0 top-0 bottom-0 w-24 border-l border-[var(--border-subtle)] hidden lg:block pointer-events-none opacity-20"></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
             {/* Logo/Icon */}
            <div className="w-16 h-16 rounded-full border border-[var(--primary)] flex items-center justify-center mx-auto mb-6 bg-[var(--bg)] shadow-[0_0_15px_var(--primary-glow)]">
               <span className="text-[var(--primary)] font-[family-name:var(--font-marcellus)] text-3xl font-bold">E</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">Join Festora</h1>
          <p className="text-[var(--fg-muted)]">Create an account to start your journey</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 relative shadow-2xl corner-bracket">


           
           {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-3 relative"
            >
               <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          <div className="space-y-4">
               <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)] text-[var(--fg)] transition-all duration-300 font-bold uppercase tracking-widest text-xs relative group overflow-hidden"
               >
                  <div className="absolute inset-0 bg-[var(--primary)]/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                  <FaGoogle className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">{loading ? 'Connecting...' : 'Sign up with Google'}</span>
               </button>

               <button
                  type="button"
                  onClick={() => setGithubComingSoon(true)}
                  className="w-full h-12 flex items-center justify-center gap-3 bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-[var(--fg)] text-[var(--fg)] transition-all duration-300 font-bold uppercase tracking-widest text-xs relative group"
               >
                  <FaGithub className="w-5 h-5" />
                  <span>{githubComingSoon ? 'Coming Soon' : 'Sign up with GitHub'}</span>
               </button>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-subtle)] text-center">
              <p className="text-[var(--fg-muted)] text-sm">
                 Already have an account?{' '}
                 <Link href="/login" className="text-[var(--primary)] font-bold hover:text-[var(--primary-light)] underline decoration-[var(--primary)]/30 underline-offset-4 transition-all">
                    Sign in
                 </Link>
              </p>
           </div>
        </div>

        <div className="text-center mt-6 text-xs text-[var(--fg-muted)] uppercase tracking-widest opacity-50">
            By joining, you agree to our Terms & Privacy Policy
         </div>
      </motion.div>
    </div>
  );
}
