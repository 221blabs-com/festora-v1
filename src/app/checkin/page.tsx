'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogOut,
  Calendar,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  QrCode,
  Users
} from 'lucide-react';
import OrganizerLogin from '@/components/organizer/OrganizerLogin';
import QRScanner from '@/components/organizer/QRScanner';
import { Spinner } from '@/components/ui/spinner';

interface OrganizerAuth {
  isAuthenticated: boolean;
  organizerName: string;
  username: string;
}

interface Event {
  id: string;
  title: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  organizerName: string;
}

interface CheckInRecord {
  id: string;
  name: string;
  ticketId: string;
  timestamp: Date;
  status: 'success' | 'failed';
  message: string;
}

const ORGANIZER_SESSION_KEY = process.env.NEXT_PUBLIC_ORGANIZER_SESSION_KEY || 'festora_organizer_session';
const SESSION_EXPIRY_HOURS = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_HOURS || '24');

export default function CheckinPage() {
  const [auth, setAuth] = useState<OrganizerAuth>({
    isAuthenticated: false,
    organizerName: '',
    username: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [checkInHistory, setCheckInHistory] = useState<CheckInRecord[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(ORGANIZER_SESSION_KEY);
      if (savedSession) {
        const session = JSON.parse(savedSession);
        // Check if session is still valid (not expired)
        if (session.expiry && new Date().getTime() < session.expiry) {
          setAuth({
            isAuthenticated: true,
            organizerName: session.organizerName,
            username: session.username
          });
          loadOrganizerEvents(session.username);
        } else {
          localStorage.removeItem(ORGANIZER_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      localStorage.removeItem(ORGANIZER_SESSION_KEY);
    }
    setIsLoading(false);
  }, []);

  const loadOrganizerEvents = async (username: string) => {
    setLoadingEvents(true);
    try {
      const response = await fetch(`/api/organizer/events?organizer=${encodeURIComponent(username)}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        // If there is only one active event, select it automatically
        if (data.events && data.events.length === 1) {
          setSelectedEvent(data.events[0]);
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleLogin = (organizerName: string, username: string) => {
    setAuth({ isAuthenticated: true, organizerName, username });
    loadOrganizerEvents(username);

    const session = {
      organizerName,
      username,
      expiry: new Date().getTime() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
    };
    localStorage.setItem(ORGANIZER_SESSION_KEY, JSON.stringify(session));
  };

  const handleLogout = () => {
    setAuth({ isAuthenticated: false, organizerName: '', username: '' });
    setEvents([]);
    setSelectedEvent(null);
    setCheckInHistory([]);
    localStorage.removeItem(ORGANIZER_SESSION_KEY);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleCheckInComplete = (participantId: string, participantData: Record<string, any>) => {
    const newRecord: CheckInRecord = {
      id: Math.random().toString(36).substr(2, 9),
      name: participantData.memberName || participantData.name || 'Attendee',
      ticketId: participantId,
      timestamp: new Date(),
      status: 'success',
      message: 'Checked in successfully'
    };
    
    setCheckInHistory(prev => [newRecord, ...prev]);
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // Authentication Screen
  if (!auth.isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex items-center justify-center font-[family-name:var(--font-josefin)] p-4">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--navy)_0%,_var(--bg)_100%)] opacity-40 pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-50" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">Event Check-in</h1>
            <p className="text-[var(--fg-muted)]">Please login to access scanner</p>
          </div>
          
          <OrganizerLogin onLogin={handleLogin} />
          
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-[var(--fg-muted)] text-sm">
              <ShieldCheck className="w-4 h-4 text-[var(--gold)]" />
              <span>Secure Check-in System</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-md border-b border-[var(--border-gold)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-[var(--gold)] w-8 h-8 rounded-full flex items-center justify-center shadow-lg shadow-[var(--gold)]/20 mt-1 mb-1 ml-1">
                <QrCode className="w-4 h-4 text-[var(--bg)]" />
              </div>
              <div>
                <h1 className="font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide hidden sm:block">Check-in Portal</h1>
                <h1 className="font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide sm:hidden">Check-in</h1>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 border border-[var(--border-subtle)] rounded-sm text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--bg-card)] text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedEvent ? (
          /* Event Selection View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2 font-[family-name:var(--font-marcellus)]">Select Event</h2>
              <p className="text-[var(--fg-muted)]">Choose an event to start checking in attendees</p>
            </div>

            {loadingEvents ? (
              <div className="flex justify-center py-12">
                <Spinner size="md" />
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm">
                <Calendar className="w-12 h-12 text-[var(--fg-muted)] mx-auto mb-4" />
                <p className="text-[var(--fg)] text-lg mb-2">No active events found</p>
                <p className="text-[var(--fg-muted)] text-sm">Create an event in the dashboard first.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {events.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="w-full text-left bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 hover:border-[var(--gold)] hover:bg-[var(--bg-card-hover)] transition-all group relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-[var(--fg)] mb-1 group-hover:text-[var(--primary-light)] transition-colors">{event.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-[var(--fg-muted)]">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {event.ticketsSold} / {event.totalTickets}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[var(--fg-muted)] group-hover:text-[var(--gold)] group-hover:translate-x-1 transition-all" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          /* Scanner View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] flex items-center gap-1 hover:underline underline-offset-4"
              >
                ← Switch Event
              </button>
              <div className="text-right">
                <h2 className="font-bold text-[var(--fg)] text-sm">{selectedEvent.title}</h2>
                <div className="flex justify-end items-center gap-2 text-xs text-[var(--fg-muted)]">
                   <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                   Live Check-in
                </div>
              </div>
            </div>

            {/* Scanner Component */}
            <QRScanner
              eventId={selectedEvent.id}
              onCheckIn={handleCheckInComplete}
            />

            {/* Recent Activity */}
            {checkInHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 font-[family-name:var(--font-marcellus)] border-b border-[var(--border-subtle)] pb-2">Recent Check-ins</h3>
                <div className="space-y-2">
                  <AnimatePresence>
                    {checkInHistory.map((record) => (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 flex items-center justify-between rounded-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-green-500" />
                          </div>
                          <div>
                            <p className="font-bold text-[var(--fg)] text-sm">{record.name}</p>
                            <p className="text-[var(--fg-muted)] text-xs font-mono">{record.ticketId}</p>
                          </div>
                        </div>
                        <span className="text-[var(--fg-muted)] text-xs">
                          {record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}

