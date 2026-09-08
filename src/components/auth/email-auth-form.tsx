'use client';

import { useState } from 'react';
import { signUpWithEmailAndPassword, signInWithEmail, formatAuthError } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check, X, AlertCircle, Loader2, Mail, Lock, User, Building2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface AuthFormProps {
  mode?: 'signin' | 'signup';
  onSuccess?: () => void;
}

export default function EmailAuthForm({ mode = 'signin', onSuccess }: AuthFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();

  // Password strength checker
  const getPasswordStrength = (password: string) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    Object.values(checks).forEach(check => check && score++);

    return {
      score,
      checks,
      level: score < 2 ? 'weak' : score < 4 ? 'medium' : 'strong'
    };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordStrength.score < 3) {
      setError('Please choose a stronger password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { user, error } = await signUpWithEmailAndPassword(email, password, {
        full_name: fullName,
        organization: organization || undefined,
      });

      if (error) {
        setError(getErrorMessage(error));
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { user, error } = await signInWithEmail(email, password);

      if (error) {
        setError(getErrorMessage(error));
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/dashboard');
        }
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: unknown) => {
    return formatAuthError(error);
  };

  const inputClassName = "w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent dark:bg-gray-700 dark:text-white transition-all duration-200";
  const iconClassName = "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5";

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-6">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Festora Logo" className="h-16 w-auto mx-auto mb-6 object-contain" />
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {isSignUp ? 'Join Festora' : 'Welcome Back'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isSignUp ? 'Create your account and start organizing amazing events' : 'Sign in to continue managing your events'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-center space-x-2 animate-in slide-in-from-top-2 duration-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSignUp && (
          <>
            <div className="space-y-4">
              <div className="relative">
                <User className={iconClassName} />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  required
                  className={inputClassName}
                />
              </div>
              <div className="relative">
                <Building2 className={iconClassName} />
                <input
                  id="organization"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Organization (Optional)"
                  className={inputClassName}
                />
              </div>
            </div>
          </>
        )}

        <div className="relative">
          <Mail className={iconClassName} />
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            required
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Lock className={iconClassName} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              placeholder="Password"
              required
              minLength={6}
              className={inputClassName}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {isSignUp && password && (passwordFocused || password.length > 0) && (
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Password Strength:</span>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  passwordStrength.level === 'weak' ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400' :
                  passwordStrength.level === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400' :
                  'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400'
                }`}>
                  {passwordStrength.level.toUpperCase()}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries({
                  'At least 8 characters': passwordStrength.checks.length,
                  'Lowercase letter': passwordStrength.checks.lowercase,
                  'Uppercase letter': passwordStrength.checks.uppercase,
                  'Number': passwordStrength.checks.number,
                }).map(([label, passed], index) => (
                  <div key={label} className={`flex items-center space-x-1 ${passed ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center space-x-2">
              <Spinner inline />
              <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center space-x-2">
              <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            </span>
          )}
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-violet-600 hover:text-violet-500 dark:text-violet-400 dark:hover:text-violet-300 text-sm font-medium hover:underline transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {!isSignUp && (
          <div className="text-center mt-2">
            <button
              type="button"
              onClick={() => {/* Add forgot password logic */}}
              className="text-gray-600 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 text-sm hover:underline transition-colors"
            >
              Forgot your password?
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
