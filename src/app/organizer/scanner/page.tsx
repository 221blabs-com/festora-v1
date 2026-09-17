/**
 * Organizer Scanner Page
 * Secure page for event organizers to scan and validate tickets
 */

'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Users, CheckCircle, XCircle, Clock, Shield, ArrowLeft, X, AlertCircle, Calendar } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import QRScanner from '@/components/organizer/QRScanner';
import OrganizerLogin from '@/components/organizer/OrganizerLogin';

// Type definitions
interface Event {
  id: string;
  title: string;
  date?: string;
  dateTime?: {
    startDate: string;
    endDate: string;
  };
  venue?: {
    name: string;
  };
}

interface Stats {
  totalTickets: number;
  totalCheckedIn: number;
  checkInRate: number;
}

function ScannerContent() {
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const eventId = searchParams?.get('eventId') || searchParams?.get('event');

  const [event, setEvent] = useState<Event | null>(null);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sessionUser, setSessionUser] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(process.env.NEXT_PUBLIC_ORGANIZER_SESSION_KEY || 'festora_organizer_session');
        if (stored) {
          const parsed = JSON.parse(stored);
          return parsed.username || null;
        }
      } catch {
        return null;
      }
    }
    return null;
  });
  const loadingRef = useRef(false); // Prevent duplicate fetches

  const handleOrganizerLogin = (organizerName: string, username: string) => {
    localStorage.setItem(
      process.env.NEXT_PUBLIC_ORGANIZER_SESSION_KEY || 'festora_organizer_session',
      JSON.stringify({
        organizerName,
        username,
        isAuthenticated: true,
        loginTime: new Date().toISOString()
      })
    );
    setSessionUser(username);
    setError(null);
    setLoading(true);
  };

  // Check for local organizer session
  useEffect(() => {
    try {
      const stored = localStorage.getItem(process.env.NEXT_PUBLIC_ORGANIZER_SESSION_KEY || 'festora_organizer_session');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.username) {
          setSessionUser(parsed.username);
        }
      }
    } catch (e) {
       console.error("No local session found");
    }
  }, []);

  useEffect(() => {
    // If we have an event ID naturally, load its stats if authenticated
    if (eventId) {
      if (user || sessionUser) {
        if (!loadingRef.current) loadEventData();
      } else {
        const timer = setTimeout(() => {
          if (!user && !sessionUser) {
             setError("Authentication required to access scanner.");
             setLoading(false);
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    } else {
      // If we DON'T have an event ID, try to fetch the organizer's active events
      if (sessionUser) {
        loadOrganizerEventsAndRedirect(sessionUser);
      } else if (!user && !sessionUser) {
         // No eventID and no login => prompt for login
         setError("Authentication required to access scanner.");
         setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionUser, eventId]);

  const loadOrganizerEventsAndRedirect = async (organizerUsername: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizer/events?organizer=${encodeURIComponent(organizerUsername)}`);
      if (res.ok) {
        const data = await res.json();
        const eventsList = data.events || [];
        if (eventsList.length === 1) {
          // If only one event exists, redirect automatically
          router.replace(`/organizer/scanner?eventId=${eventsList[0].id}`);
        } else if (eventsList.length > 1) {
          // Put the user into an event selection state
          setAvailableEvents(eventsList);
          setError("SELECT_EVENT");
          setLoading(false);
        } else {
          setError("No active events found for your account.");
          setLoading(false);
        }
      } else {
         setError("Failed to load your events. Please go to your dashboard and pick an event manually.");
         setLoading(false);
      }
    } catch (e) {
      setError("Failed to fetch events. Ensure you are connected to the network.");
      setLoading(false);
    }
  };

  const loadEventData = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Always include organizer session header when available
      if (sessionUser) {
        headers['X-Organizer-Username'] = sessionUser;
      }

      // Also include bearer token when user is logged in via Firebase
      if (user) {
        try {
          const idToken = await user.getIdToken();
          headers['Authorization'] = `Bearer ${idToken}`;
        } catch {
          // Fall back to sessionUser header
        }
      }

      if (!sessionUser && !user) {
        return;
      }

      // Load event stats (this will also verify authorization)
      const response = await fetch(`/api/events/stats?eventId=${eventId}`, {
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load event data (${response.status})`);
      }

      const data = await response.json();
      setEvent(data.event);
      setStats(data.stats);
      setIsAuthorized(true);
      setShowScanner(true);

    } catch (err) {
      console.error('Error loading event data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load event details');
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Simple QR Scanner Modal that uses our improved component
  const QRScannerModal = () => {
    const handleCheckIn = () => {
      // Reload stats after successful check-in
      loadEventData();
    };

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowScanner(false);
          }
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-lg my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={() => setShowScanner(false)}
            className="absolute -top-12 right-0 p-2 text-gray-400 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Scanner Component */}
          <QRScanner
            eventId={eventId || ''}
            onCheckIn={handleCheckIn}
          />
        </motion.div>
      </motion.div>
    );
  };

  if (loading || (!user && !sessionUser && !error)) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-[var(--gold)] mt-4 font-[family-name:var(--font-josefin)] uppercase tracking-wider text-sm">Loading scanner...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !isAuthorized) {
    if (error === "Authentication required to access scanner.") {
      return (
        <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <Shield className="w-16 h-16 text-[var(--gold)] mx-auto mb-4 opacity-80" />
              <h1 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                Organizer Login
              </h1>
              <p className="text-[var(--fg-muted)] mt-2 font-[family-name:var(--font-josefin)] text-sm">
                Log in to access the event check-in scanner
              </p>
            </div>
            <OrganizerLogin onLogin={handleOrganizerLogin} />
          </div>
        </div>
      );
    }

    if (error === "SELECT_EVENT") {
      return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8 font-[family-name:var(--font-josefin)] flex items-center justify-center">
          <div className="w-full max-w-4xl">
            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-[var(--bg)] border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_15px_rgba(212,175,55,0.1)]">
                <Calendar className="w-10 h-10 text-[var(--gold)] " />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                Select Event
              </h1>
              <p className="text-[var(--fg-muted)] text-sm uppercase tracking-widest max-w-md mx-auto">
                Choose the active event you wish to monitor and scan tickets for
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
              {availableEvents.map(evt => (
                <button 
                  key={evt.id} 
                  onClick={() => router.push(`/organizer/scanner?eventId=${evt.id}`)} 
                  className="text-left bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--gold)]/50 p-6 sm:p-8 corner-bracket transition-all group hover:shadow-[0_0_20px_rgba(212,175,55,0.05)] relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gold)]/5 opacity-0 group-hover:opacity-100 rounded-bl-full transition-opacity pointer-events-none" />
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                    <ArrowLeft className="w-5 h-5 text-[var(--gold)] rotate-180" />
                  </div>
                  
                  <h3 className="font-bold text-lg text-[var(--fg)] mb-3 font-[family-name:var(--font-marcellus)] uppercase tracking-wide group-hover:text-[var(--gold)] transition-colors pr-8">
                    {evt.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[var(--gold)] opacity-80 text-sm tracking-wide">
                    <Clock className="w-4 h-4" />
                    <span>
                      {new Date(evt.date || Date.now()).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const isAuthError =
      error?.toLowerCase().includes('authorized') ||
      error?.toLowerCase().includes('permission') ||
      error?.toLowerCase().includes('authentication');

    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <div className="text-center max-w-md mx-auto p-6 sm:p-8 border border-[var(--border-subtle)] bg-[var(--bg-card)] corner-bracket shadow-2xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
            {isAuthError ? 'Access Denied' : 'Unable to Load Scanner'}
          </h2>
          <p className="text-[var(--fg-muted)] mb-6 font-[family-name:var(--font-josefin)] leading-relaxed text-sm">
            {error || 'You do not have permission to access this scanner'}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setError(null);
                loadEventData();
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-[var(--gold)] text-[var(--bg)] hover:bg-white transition-colors font-[family-name:var(--font-josefin)] uppercase tracking-widest text-xs font-semibold"
            >
              Try Again
            </button>
            <Link
              href="/organizer"
              className="w-full sm:w-auto px-6 py-2.5 bg-[var(--bg)] border border-[var(--border-gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--bg)] transition-colors font-[family-name:var(--font-josefin)] uppercase tracking-widest text-xs text-center"
            >
              Dashboard
            </Link>
            <button
              onClick={() => window.close()}
              className="w-full sm:w-auto px-6 py-2.5 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors font-[family-name:var(--font-josefin)] uppercase tracking-widest text-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date || new Date());
  const isEventToday = eventDate.toDateString() === new Date().toDateString();
  const isEventPast = eventDate < new Date();

  return (
    <div className="min-h-screen bg-[var(--bg)] font-[family-name:var(--font-josefin)] text-[var(--fg)]">
      {/* Header */}
      <div className="bg-[var(--bg-card)] relative overflow-hidden border-b border-[var(--border-subtle)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--gold)]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="container mx-auto px-4 py-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/events"
                className="p-2 text-[var(--fg-muted)] hover:text-[var(--gold)] hover:bg-[var(--bg-card-hover)] rounded-sm transition-colors border border-transparent hover:border-[var(--border-subtle)]"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                  Event Check-in Scanner
                </h1>
                <p className="text-[var(--fg-muted)] text-sm">
                  Scan tickets to check in attendees
                </p>
              </div>
            </div>

            {isEventToday && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 rounded-sm text-sm font-medium border border-green-500/20 uppercase tracking-widest">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Event Today
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Event Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] corner-bracket border border-[var(--border-gold)] p-6 mb-8 relative overflow-hidden"
        >
          <div className="absolute -right-16 -top-16 w-48 h-48 border border-[var(--gold)] opacity-10 rounded-full" />
          <div className="absolute -right-8 -top-8 w-32 h-32 border border-[var(--gold)] opacity-15 rounded-full" />
          
          <div className="flex flex-col sm:flex-row items-start gap-6 relative z-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[var(--bg)] border border-[var(--gold)] rounded-full flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(212,175,55,0.1)] mt-2 sm:mt-0 sm:ml-4 sm:mb-4">
              <span className="text-[var(--gold)] text-2xl font-bold font-[family-name:var(--font-marcellus)] ">
                {event.title.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 mt-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[var(--fg)] mb-3 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                {event.title}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 text-sm text-[var(--fg-muted)]">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[var(--gold)] opacity-80" />
                  <span className="tracking-wide">
                    {eventDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-[var(--gold)] opacity-80" />
                  <span className="tracking-wide">{event.venue?.name || 'Online Event'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Analytics Cards */}
        {stats && (
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[var(--bg-card)] corner-bracket p-5 border border-[var(--border-subtle)] relative overflow-hidden group hover:border-[var(--gold)]/30 transition-colors"
            >
              <div className="absolute right-0 top-0 w-16 h-16 bg-[var(--gold)]/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider mb-1 font-[family-name:var(--font-josefin)]">Total Tickets</p>
                  <p className="text-2xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">
                    {stats.totalTickets}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm group-hover:border-[var(--gold)]/30 transition-colors">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--gold)]" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[var(--bg-card)] corner-bracket p-5 border border-[var(--border-subtle)] relative overflow-hidden group hover:border-green-500/30 transition-colors"
            >
              <div className="absolute right-0 top-0 w-16 h-16 bg-green-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider mb-1 font-[family-name:var(--font-josefin)]">Checked In</p>
                  <p className="text-2xl font-bold text-green-400 font-[family-name:var(--font-marcellus)]">
                    {stats.totalCheckedIn}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm group-hover:border-green-500/30 transition-colors">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-[var(--bg-card)] corner-bracket p-5 border border-[var(--border-subtle)] relative overflow-hidden group hover:border-cyan-500/30 transition-colors"
            >
              <div className="absolute right-0 top-0 w-16 h-16 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider mb-1 font-[family-name:var(--font-josefin)]">Check-in Rate</p>
                  <p className="text-2xl font-bold text-cyan-400 font-[family-name:var(--font-marcellus)]">
                    {Math.round(stats.checkInRate)}%
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm group-hover:border-cyan-500/30 transition-colors">
                  <Scan className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-[var(--bg-card)] corner-bracket p-5 border border-[var(--border-subtle)] relative overflow-hidden group hover:border-red-500/30 transition-colors"
            >
              <div className="absolute right-0 top-0 w-16 h-16 bg-red-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-xs text-[var(--fg-muted)] uppercase tracking-wider mb-1 font-[family-name:var(--font-josefin)]">No Shows</p>
                  <p className="text-2xl font-bold text-red-400 font-[family-name:var(--font-marcellus)]">
                    {stats.totalTickets - stats.totalCheckedIn}
                  </p>
                </div>
                <div className="p-2 sm:p-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm group-hover:border-red-500/30 transition-colors">
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Scanner Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center"
        >
          <div className="bg-[var(--bg-card)] corner-bracket border border-[var(--border-gold)] p-8 sm:p-12 relative overflow-hidden group hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] transition-shadow">
            <div className="absolute inset-0 bg-[var(--gold)]/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[var(--bg)] border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-10 sm:mb-12 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
              <Scan className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--gold)] " />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-[var(--fg)] mb-4 font-[family-name:var(--font-marcellus)] uppercase tracking-widest relative z-10">
              Ready to Scan Tickets
            </h3>

            <p className="text-[var(--fg-muted)] mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed relative z-10">
              Use your device&apos;s camera to scan QR codes on attendee tickets.
              The system will automatically validate and check them in.
            </p>

            {isEventPast ? (
              <div className="p-4 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm mb-8 relative z-10">
                <p className="text-[var(--fg-muted)] text-sm uppercase tracking-wide">
                  This event has ended, but you can still scan tickets for analytics.
                </p>
              </div>
            ) : !isEventToday ? (
              <div className="p-4 bg-[var(--bg)] border border-[var(--gold)]/30 rounded-sm mb-8 relative z-10">
                <p className="text-[var(--gold)] text-sm uppercase tracking-wide flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4" />
                  Event is scheduled for{' '}
                  {eventDate.toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  })}
                </p>
              </div>
            ) : null}

            <button
              onClick={() => setShowScanner(true)}
              className="relative z-10 inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-[var(--gold)] text-[var(--bg)] hover:bg-white rounded-sm font-semibold text-sm sm:text-base tracking-widest uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.5)] transform hover:-translate-y-1"
            >
              <Scan className="w-5 h-5 sm:w-6 sm:h-6" />
              Start Scanning
            </button>

            {/* Security Notice */}
            <div className="mt-10 sm:mt-12 p-5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-sm max-w-sm mx-auto relative z-10">
              <div className="flex items-center gap-4 text-[var(--fg-muted)]">
                <div className="p-2 border border-[var(--border-subtle)] rounded-full text-[var(--gold)]">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[var(--fg)] text-xs uppercase tracking-widest mb-1">Secure Scanner</p>
                  <p className="text-xs opacity-90 leading-relaxed font-[family-name:var(--font-josefin)]">
                    All scans are logged and verified against our secure database.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Usage Instructions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-[var(--bg-card)] corner-bracket border border-[var(--border-subtle)] p-6 sm:p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
          
          <h4 className="text-lg font-bold text-[var(--fg)] mb-6 sm:mb-8 font-[family-name:var(--font-marcellus)] uppercase tracking-wide text-center sm:text-left relative z-10">
            How to Use the Scanner
          </h4>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-6 relative z-10">
            <div className="text-center group">
              <div className="w-14 h-14 bg-[var(--bg)] border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 transition-transform group-hover:scale-110">
                <span className="text-[var(--gold)] font-bold text-lg font-[family-name:var(--font-marcellus)] ">1</span>
              </div>
              <h5 className="font-bold text-[var(--fg)] mb-2 uppercase tracking-wide text-sm font-[family-name:var(--font-marcellus)]">Start Scanner</h5>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Click &quot;Start Scanning&quot; to activate your device camera and allow permissions.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-14 h-14 bg-[var(--bg)] border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 transition-transform group-hover:scale-110">
                <span className="text-[var(--gold)] font-bold text-lg font-[family-name:var(--font-marcellus)] ">2</span>
              </div>
              <h5 className="font-bold text-[var(--fg)] mb-2 uppercase tracking-wide text-sm font-[family-name:var(--font-marcellus)]">Scan Ticket</h5>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                Point the camera at the attendee&apos;s QR code. They can show it on their phone.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-14 h-14 bg-[var(--bg)] border border-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 transition-transform group-hover:scale-110">
                <span className="text-[var(--gold)] font-bold text-lg font-[family-name:var(--font-marcellus)] ">3</span>
              </div>
              <h5 className="font-bold text-[var(--fg)] mb-2 uppercase tracking-wide text-sm font-[family-name:var(--font-marcellus)]">Automatic Entry</h5>
              <p className="text-sm text-[var(--fg-muted)] leading-relaxed">
                The system instantly validates and securely logs the attendee check-in.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && <QRScannerModal />}
      </AnimatePresence>
    </div>
  );
}

export default function OrganizerScannerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-[var(--gold)] mt-4 font-[family-name:var(--font-josefin)] uppercase tracking-wider text-sm">Loading scanner...</p>
        </div>
      </div>
    }>
      <ScannerContent />
    </Suspense>
  );
}
