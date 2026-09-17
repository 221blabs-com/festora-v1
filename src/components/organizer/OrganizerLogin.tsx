'use client';

import { useState } from 'react';
import { Building2, Lock, User, Eye, EyeOff, AlertCircle, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface OrganizerLoginProps {
  onLogin: (organizerName: string, username: string) => void;
}

export default function OrganizerLogin({ onLogin }: OrganizerLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate against the organizers collection in Firebase
      const response = await fetch('/api/auth/organizer-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Login successful
        onLogin(data.organizerName, data.username);
      } else {
        // Login failed
        setError(data.error || 'Invalid username or password. Please try again.');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Authentication failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-md p-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] relative font-[family-name:var(--font-josefin)] text-[var(--fg)]">
      {/* Decorative corners */}
      <div className="hidden top-0 left-0"></div>
      <div className="hidden top-0 right-0 rotate-90"></div>
      <div className="hidden bottom-0 left-0 -rotate-90"></div>
      <div className="hidden bottom-0 right-0 rotate-180"></div>

      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Festora Logo" className="w-full h-full object-contain" />
        </div>
        <h2 className="text-2xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">
          Organizer Access
        </h2>
        <p className="text-[var(--fg-muted)] text-sm mt-2">Manage Your Events</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="deco-label">Organizer ID / Username / Email</label>
          <div className="relative flex items-center">
            <User className="absolute left-3.5 w-5 h-5 text-[var(--fg-muted)] pointer-events-none" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="deco-input"
              style={{ paddingLeft: '2.75rem' }}
              placeholder="e.g. mru or festora"
            />
          </div>
        </div>

        <div className="space-y-2">
           <label className="deco-label">Organizer Password</label>
           <div className="relative flex items-center">
             <Lock className="absolute left-3.5 w-5 h-5 text-[var(--fg-muted)] pointer-events-none" />
             <input
               type={showPassword ? 'text' : 'password'}
               required
               value={password}
               onChange={(e) => setPassword(e.target.value)}
               className="deco-input"
               style={{ paddingLeft: '2.75rem', paddingRight: '2.75rem' }}
               placeholder="Enter your organizer password"
             />
             <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-3.5 text-[var(--fg-muted)] hover:text-[var(--primary)] transition-colors p-1 flex items-center justify-center"
               title={showPassword ? 'Hide password' : 'Show password'}
             >
               {showPassword ? (
                 <EyeOff className="w-5 h-5" />
               ) : (
                 <Eye className="w-5 h-5" />
               )}
             </button>
           </div>
           <p className="text-[11px] text-[var(--fg-muted)]">
             Use the credentials received via email or set during event registration.
           </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full mt-6"
        >
          {loading ? (
             <Spinner inline />
          ) : (
             'Access Dashboard'
          )}
        </button>
      </form>
      
      <div className="mt-8 pt-4 border-t border-[var(--border-subtle)] text-center">
         <p className="text-[var(--fg-muted)] text-xs uppercase tracking-widest flex items-center justify-center gap-2">
            <Sparkles className="w-3 h-3 text-[var(--gold)]" />
            Festora Organizers
            <Sparkles className="w-3 h-3 text-[var(--gold)]" />
         </p>
      </div>
    </div>
  );
}
