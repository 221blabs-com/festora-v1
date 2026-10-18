'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShieldAlert, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa';

import { useAuth } from '@/contexts/auth-context';
import { Spinner } from '@/components/ui/spinner';
import { formatAuthError } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  // Don't render the login form if user is authenticated
  if (user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center font-[family-name:var(--font-josefin)] text-center">
        <div>
          <Spinner />
          <p className="uppercase tracking-widest text-sm font-bold mt-4 text-[var(--gold)]">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  const handleManualSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);

    try {
      const result = await signIn(email.trim().toLowerCase(), password);
      if (result.error) {
        throw result.error;
      }
      router.push('/dashboard');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithGoogle();
      if (result.error) {
        throw result.error;
      }
      router.push('/dashboard');
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Pattern & Ambient Glow */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[var(--primary)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[var(--gold)]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Side Borders */}
      <div className="fixed left-0 top-0 bottom-0 w-24 border-r border-[var(--border-subtle)] hidden lg:block pointer-events-none opacity-40" />
      <div className="fixed right-0 top-0 bottom-0 w-24 border-l border-[var(--border-subtle)] hidden lg:block pointer-events-none opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[480px] relative z-10 my-8"
      >
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3 group">
            <div className="w-16 h-16 rounded-full border border-[var(--gold)] p-2 mx-auto bg-[var(--bg-card)] transition-colors hover:border-[var(--primary)] flex items-center justify-center overflow-hidden">
              <Image
                src="/logo.png"
                alt="Festora Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
              />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-marcellus)] uppercase tracking-wider text-[var(--fg)] mb-1">
            Welcome Back
          </h1>
          <p className="text-[11px] uppercase tracking-[2px] text-[var(--gold)] font-semibold">
            Sign In to Your Festora Account
          </p>
        </div>

        {/* Existing UI Container */}
        <div className="form-container !w-full !max-w-none !my-0 !p-[32px] sm:!p-[38px]">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 bg-[var(--primary)]/10 border border-[var(--primary)] text-[var(--fg)] text-xs flex items-center gap-3"
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-[var(--gold)]" />
              <p>{error}</p>
            </motion.div>
          )}

          {/* Manual Entry Form */}
          <form onSubmit={handleManualSignIn} className="space-y-4">
            {/* Email ID Field */}
            <div className="form-group !mt-0">
              <label className="form-label">
                Email ID <span className="text-[var(--primary)]">*</span>
              </label>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input
                  type="email"
                  required
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group !mt-4">
              <label className="form-label">
                Password <span className="text-[var(--primary)]">*</span>
              </label>
              <div className="password-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Manual Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="proceed-button flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Festora</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-[10px] uppercase tracking-[2px] text-[var(--gold)] font-bold">OR</span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 px-4 bg-transparent border border-[var(--border-subtle)] hover:border-[var(--gold)] text-[var(--fg)] hover:text-[var(--fg)] text-xs font-bold uppercase tracking-[2px] flex items-center justify-center gap-3 rounded-[11px] transition-all cursor-pointer"
          >
            <FaGoogle className="w-4 h-4 text-[var(--primary)]" />
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* Toggle to Sign Up */}
          <div className="mt-6 pt-5 border-t border-[var(--border-subtle)] text-center">
            <p className="text-[var(--fg-muted)] text-xs">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-[var(--gold)] font-bold hover:text-[var(--gold-light)] underline decoration-[var(--primary)] underline-offset-4 transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-5 text-[0.65rem] text-[var(--fg-muted)] uppercase tracking-[2px]">
          Secure Access &bull; Festora &bull; 221B Labs
        </div>
      </motion.div>
    </div>
  );
}
