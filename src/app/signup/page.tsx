'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { FaGoogle } from 'react-icons/fa';

import { useAuth } from '@/contexts/auth-context';
import { Spinner } from '@/components/ui/spinner';
import { formatAuthError } from '@/lib/auth';

export default function SignupPage() {
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, signUp, signInWithGoogle } = useAuth();
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
      <div className="min-h-screen bg-[#0a0507] flex items-center justify-center font-[family-name:var(--font-josefin)] text-center">
        <div>
          <Spinner />
          <p className="uppercase tracking-widest text-sm font-bold mt-4 text-yellow-400">
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    );
  }

  const handleManualSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email.trim().toLowerCase(), password, {
        full_name: firstName.trim(),
        phone: phone.trim()
      });

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

  const handleGoogleSignUp = async () => {
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
    <div className="min-h-screen bg-[#090909] text-[#e8e8e8] font-[family-name:var(--font-josefin)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Pattern & Ambient Glow */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#d31438]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#ffd400]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Side Borders */}
      <div className="fixed left-0 top-0 bottom-0 w-24 border-r border-[#3f1119]/50 hidden lg:block pointer-events-none opacity-40" />
      <div className="fixed right-0 top-0 bottom-0 w-24 border-l border-[#3f1119]/50 hidden lg:block pointer-events-none opacity-40" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[480px] relative z-10 my-8"
      >
        {/* Brand Header with Specified Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block mb-3 group">
            <div className="w-16 h-16 rounded-full border border-[#ffd400] p-2 mx-auto bg-[#121212] transition-colors hover:border-[#d31438] flex items-center justify-center overflow-hidden">
              <Image
                src="https://festora.221blabs.com/_next/image?url=%2Flogo.png&w=96&q=75"
                alt="Festora Logo"
                width={80}
                height={80}
                className="w-full h-full object-contain"
                unoptimized
              />
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-marcellus)] uppercase tracking-wider text-[#e8e8e8] mb-1">
            Join Festora
          </h1>
          <p className="text-[11px] uppercase tracking-[2px] text-[#ffd400] font-semibold">
            Create Your Account &amp; Start Exploring
          </p>
        </div>

        {/* Existing UI Container */}
        <div className="form-container !w-full !max-w-none !my-0 !p-[32px] sm:!p-[38px]">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-3.5 bg-[#1a0509] border border-[#d31438] text-red-300 text-xs flex items-center gap-3"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#ffd400]" />
              <p>{error}</p>
            </motion.div>
          )}

          {/* Manual Entry Form */}
          <form onSubmit={handleManualSignUp} className="space-y-4">
            {/* First Name Field */}
            <div className="form-group !mt-0">
              <label className="form-label">
                First Name <span className="text-[#d31438]">*</span>
              </label>
              <div className="input-wrapper">
                <User className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Arvind"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Email ID Field */}
            <div className="form-group !mt-4">
              <label className="form-label">
                Email ID <span className="text-[#d31438]">*</span>
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

            {/* Phone Number Field */}
            <div className="form-group !mt-4">
              <label className="form-label">
                Phone Number <span className="text-[#d31438]">*</span>
              </label>
              <div className="input-wrapper">
                <Phone className="input-icon" />
                <input
                  type="tel"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group !mt-4">
              <label className="form-label">
                Password <span className="text-[#d31438]">*</span>
              </label>
              <div className="password-wrapper">
                <Lock className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
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

            {/* Manual Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="proceed-button flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Festora Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#3f1119]" />
            <span className="text-[10px] uppercase tracking-[2px] text-[#ffd400] font-bold">OR</span>
            <div className="flex-1 h-px bg-[#3f1119]" />
          </div>

          {/* Google Sign Up */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={loading}
            className="w-full py-3 px-4 bg-transparent border border-[#3f1119] hover:border-[#ffd400] text-[#e8e8e8] hover:text-white text-xs font-bold uppercase tracking-[2px] flex items-center justify-center gap-3 rounded-[11px] transition-all cursor-pointer"
          >
            <FaGoogle className="w-4 h-4 text-[#d31438]" />
            <span>{loading ? 'Connecting...' : 'Sign up with Google'}</span>
          </button>

          {/* Toggle to Sign In */}
          <div className="mt-6 pt-5 border-t border-[#3f1119] text-center">
            <p className="text-[#9a9a9a] text-xs">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-[#ffd400] font-bold hover:text-yellow-300 underline decoration-[#d31438] underline-offset-4 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-5 text-[0.65rem] text-[#858585] uppercase tracking-[2px]">
          By joining, you agree to our Terms &bull; Encrypted Access
        </div>
      </motion.div>
    </div>
  );
}
