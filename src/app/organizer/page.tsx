'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import {
  Calendar,
  Users,
  BarChart3,
  RefreshCw,
  Menu,
  X,
  LogOut,
  Sparkles,
  Building2,
  Edit3,
  Save,
  MapPin,
  DollarSign,
  FileText,
  Tag,
  ExternalLink,
  SlidersHorizontal
} from 'lucide-react';
import OrganizerLogin from '@/components/organizer/OrganizerLogin';
import AnalyticsDashboard from '@/components/organizer/AnalyticsDashboard';
import ProfileEditor from '@/components/organizer/ProfileEditor';
import QRScanner from '@/components/organizer/QRScanner';
import ParticipantFieldsModal from '@/components/organizer/ParticipantFieldsModal';

interface OrganizerAuth {
  isAuthenticated: boolean;
  organizerName: string;
  username: string;
}

interface Event {
  id: string;
  slug?: string;
  title: string;
  date: string;
  startDate?: string;
  endDate?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  ticketsSold: number;
  totalTickets: number;
  capacity?: number;
  ticketPrice?: number;
  price?: number;
  currency?: string;
  revenue: number;
  organizerName: string;
  category?: string;
  categories?: string[];
  image?: string;
  location?: any;
  venue?: any;
  description?: string;
  registrationFields?: any;
}

interface OrganizerProfile {
  id: string;
  name: string;
  subtitle?: string;
  links?: {
    website?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
}

const ORGANIZER_SESSION_KEY = process.env.NEXT_PUBLIC_ORGANIZER_SESSION_KEY || 'festora_organizer_session';
const SESSION_EXPIRY_HOURS = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_HOURS || '24');

export default function OrganizerPage() {
  const [auth, setAuth] = useState<OrganizerAuth>({
    isAuthenticated: false,
    organizerName: '',
    username: ''
  });
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<'events' | 'profile'>('events');
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);

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
          // Load events by username (which is the event slug)
          loadOrganizerEvents(session.username);
        } else {
          // Session expired, clear it
          localStorage.removeItem(ORGANIZER_SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading organizer session:', error);
      localStorage.removeItem(ORGANIZER_SESSION_KEY);
    }
    setIsLoading(false);
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Hide footer for organizer page
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (footer) footer.style.display = 'none';

    return () => {
      if (footer) footer.style.display = '';
    };
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);

  // Load organizer events after authentication
  const loadOrganizerEvents = async (username: string) => {
    setLoading(true);
    setIsSyncing(true);
    try {
      // Use username (which is the event slug) to fetch events with cache-busting
      const response = await fetch(`/api/organizer/events?organizer=${encodeURIComponent(username)}&noCache=true&_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (response.ok) {
        const data = await response.json();
        const eventList = data.events || [];
        setEvents(eventList);
        setSelectedEvent(prev => {
          if (!prev) return eventList[0] || null;
          return eventList.find((e: Event) => e.id === prev.id) || eventList[0] || null;
        });
      }

      // Also fetch organizer profile
      const profileRes = await fetch(`/api/organizer/profile?username=${encodeURIComponent(username)}&_t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        if (profileData.success) {
          setOrganizerProfile(profileData.organizer);
        }
      }
    } catch (error) {
      console.error('Error loading organizer events:', error);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  };

  const handleLogin = (organizerName: string, username: string) => {
    setAuth({ isAuthenticated: true, organizerName, username });
    // Load events by username (which is the event slug)
    loadOrganizerEvents(username);

    // Save session to localStorage with expiry
    const session = {
      organizerName,
      username,
      expiry: new Date().getTime() + (SESSION_EXPIRY_HOURS * 60 * 60 * 1000)
    };
    localStorage.setItem(ORGANIZER_SESSION_KEY, JSON.stringify(session));
  };

  const handleLogout = () => {
    fetch('/api/auth/organizer-login', { method: 'DELETE' }).catch(() => {});
    setAuth({ isAuthenticated: false, organizerName: '', username: '' });
    setEvents([]);
    setSelectedEvent(null);
    localStorage.removeItem(ORGANIZER_SESSION_KEY);
  };

  // Inline editing logic removed. Now routes to /organizer/events/[id]/edit

  // Show loading state while checking session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--bg)] flex items-center justify-center font-[family-name:var(--font-josefin)]">
        <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>
        <div className="relative z-10 w-full max-w-md p-4">
          <OrganizerLogin onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] text-[var(--fg)] flex overflow-hidden font-[family-name:var(--font-josefin)]" data-lenis-prevent>
      {/* Background Effects */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none z-0"></div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <motion.div
            initial={isMobile ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`${isMobile ? 'fixed left-0 top-0 h-full z-50' : 'relative'} w-72 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] flex flex-col`}
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-[var(--gold)] transform rounded-full flex items-center justify-center bg-[var(--bg)] shrink-0">
                    <Building2 className="w-5 h-5 text-[var(--gold)] transform " />
                  </div>
                  <div>
                    <h2 className="font-bold text-[var(--fg)] uppercase tracking-wide text-sm font-[family-name:var(--font-marcellus)] line-clamp-1">{organizerProfile?.name || 'Organizer'}</h2>
                    <p className="text-[10px] text-[var(--fg-muted)] uppercase tracking-widest line-clamp-1">{organizerProfile?.subtitle || auth.username}</p>
                  </div>
                </div>
                {isMobile && (
                  <button onClick={() => setSidebarOpen(false)} className="text-[var(--fg-muted)]">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--fg-muted)] font-bold">Events</h3>
                  <Link
                    href="/organizer/apply"
                    className="text-[10px] text-[var(--primary)] hover:text-[var(--primary-light)] uppercase tracking-wider font-bold flex items-center gap-1 border border-[var(--primary)]/30 hover:border-[var(--primary)] px-2 py-0.5 rounded transition-all"
                  >
                    + New Event
                  </Link>
                </div>
                <div className="space-y-2">
                  {loading ? (
                    <div className="animate-pulse space-y-2 px-2">
                      <div className="h-10 bg-[var(--bg)] rounded opacity-50"></div>
                      <div className="h-10 bg-[var(--bg)] rounded opacity-50"></div>
                    </div>
                  ) : events.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-[var(--fg-muted)] border border-dashed border-[var(--border-subtle)]">
                      No events found
                    </div>
                  ) : (
                    events.map(event => (
                      <button
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setActiveTab('events');
                          if (isMobile) setSidebarOpen(false);
                        }}
                        className={`w-full text-left p-3 flex items-center gap-3 relative group transition-all duration-300 ${
                          activeTab === 'events' && selectedEvent?.id === event.id
                            ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30'
                            : 'text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)] border border-transparent'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 transform rounded-full ${selectedEvent?.id === event.id ? 'bg-[var(--primary)]' : 'bg-[var(--fg-muted)] group-hover:bg-[var(--gold)]'} transition-colors`}></div>
                        <span className="truncate font-medium text-sm">{event.title}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Connect Links */}
              {organizerProfile?.links && Object.keys(organizerProfile.links).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xs uppercase tracking-widest text-[var(--fg-muted)] mb-4 px-2 font-bold">Connect</h3>
                  <div className="flex flex-col gap-2 px-2">
                    {organizerProfile.links.website && (
                      <a href={organizerProfile.links.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--fg-muted)] hover:text-[var(--gold)] transition-colors flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]/50"></div>
                        Website
                      </a>
                    )}
                    {organizerProfile.links.instagram && (
                      <a href={organizerProfile.links.instagram} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--fg-muted)] hover:text-[var(--gold)] transition-colors flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]/50"></div>
                        Instagram
                      </a>
                    )}
                    {organizerProfile.links.linkedin && (
                      <a href={organizerProfile.links.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--fg-muted)] hover:text-[var(--gold)] transition-colors flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]/50"></div>
                        LinkedIn
                      </a>
                    )}
                    {organizerProfile.links.youtube && (
                      <a href={organizerProfile.links.youtube} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--fg-muted)] hover:text-[var(--gold)] transition-colors flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--gold)]/50"></div>
                        YouTube
                      </a>
                    )}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xs uppercase tracking-widest text-[var(--fg-muted)] mb-4 px-2 font-bold">Settings</h3>
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`w-full text-left p-3 flex items-center gap-3 relative group transition-all duration-300 ${
                    activeTab === 'profile'
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30'
                      : 'text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)] border border-transparent'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="truncate font-medium text-sm">Profile Details</span>
                </button>
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-[var(--border-subtle)]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-3 text-red-400 hover:bg-red-500/10 hover:text-red-500 transition-colors uppercase tracking-widest text-xs font-bold border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Top Header (Mobile) */}
        <header className="h-16 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[var(--fg)] p-2"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-[family-name:var(--font-marcellus)] uppercase font-bold text-[var(--primary)]">Festora Organizer</span>
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--bg)] relative z-0">
          {activeTab === 'profile' ? (
            <ProfileEditor organizerProfile={organizerProfile} auth={auth} />
          ) : selectedEvent ? (
            <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
              {/* Event Header */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-[var(--border-subtle)]">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">
                      {selectedEvent.title}
                    </h1>
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest border ${
                      selectedEvent.status === 'upcoming' ? 'border-green-500 text-green-500 bg-green-500/10' :
                      selectedEvent.status === 'ongoing' ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
                      'border-gray-500 text-gray-500'
                    }`}>
                      {selectedEvent.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-6 text-[var(--fg-muted)] text-sm uppercase tracking-wide">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--gold)]" />
                      {(() => {
                        const dStr = selectedEvent.startDate || selectedEvent.date;
                        if (!dStr) return 'TBA';
                        const d = new Date(dStr);
                        return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('en-GB');
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-[var(--gold)]" />
                      {selectedEvent.ticketsSold} / {selectedEvent.totalTickets} Tickets
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowFieldsModal(true)}
                    className="btn-ghost py-2 h-10 text-xs px-4 flex items-center gap-2 border border-[var(--gold)]/40 hover:border-[var(--gold)] hover:bg-[var(--gold)]/10 text-[var(--gold)] transition-all cursor-pointer font-bold uppercase tracking-wider"
                    title="Configure preset & custom participant form fields"
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[var(--gold)]" /> Form Fields
                  </button>
                  <button
                    onClick={() => setShowScannerModal(true)}
                    className="btn-ghost py-2 h-10 text-xs px-4 flex items-center gap-2 border border-[var(--border-subtle)] hover:border-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[var(--gold)]" /> Open Scanner
                  </button>
                  <button
                    onClick={() => loadOrganizerEvents(auth.username)}
                    disabled={isSyncing}
                    className="btn-primary py-2 h-10 text-xs px-4 flex items-center gap-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync Stats'}
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="event-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-[var(--gold)] mb-2"><Users className="w-8 h-8" /></span>
                  <span className="text-3xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)]">{selectedEvent.ticketsSold}</span>
                  <span className="text-[var(--fg-muted)] text-xs uppercase tracking-widest mt-1">Total Attendees</span>
                </div>
                <div className="event-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-[var(--primary)] mb-2"><BarChart3 className="w-8 h-8" /></span>
                  <span className="text-3xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)]">{selectedEvent.totalTickets > 0 ? Math.round((selectedEvent.ticketsSold / selectedEvent.totalTickets) * 100) : 0}%</span>
                  <span className="text-[var(--fg-muted)] text-xs uppercase tracking-widest mt-1">Sold Out</span>
                </div>
                <div className="event-card p-6 flex flex-col items-center justify-center text-center">
                  <span className="text-green-500 mb-2"><Sparkles className="w-8 h-8" /></span>
                  <span className="text-3xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)]">
                    {selectedEvent.currency === 'USD' ? '$' : '₹'}{selectedEvent.revenue.toLocaleString()}
                  </span>
                  <span className="text-[var(--fg-muted)] text-xs uppercase tracking-widest mt-1">Total Revenue</span>
                </div>
              </div>

              {/* Event Editor */}
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[var(--fg)] font-[family-name:var(--font-marcellus)] flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[var(--gold)]" />
                    Event Details
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowFieldsModal(true)}
                      className="text-xs px-3 py-1.5 border border-[var(--gold)]/40 text-[var(--gold)] hover:bg-[var(--gold)]/10 rounded transition-colors uppercase tracking-wider font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3 h-3" /> Form Fields
                    </button>
                    <Link
                      href={`/organizer/events/${selectedEvent.id}/edit`}
                      className="text-xs px-3 py-1.5 border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--gold)] hover:border-[var(--gold)] rounded transition-colors uppercase tracking-wider font-bold flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3 h-3" /> Edit Event
                    </Link>
                  </div>
                </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold">Event Title</label>
                      <p className="text-sm text-[var(--fg)] font-[family-name:var(--font-marcellus)]">{selectedEvent.title}</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-1">
                        <Tag className="w-3 h-3" /> Category
                      </label>
                      <p className="text-sm text-[var(--fg)]">
                        {selectedEvent.category || (selectedEvent.categories && selectedEvent.categories[0]) || 'General'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Date
                      </label>
                      <p className="text-sm text-[var(--fg)]">
                        {(() => {
                          const dStr = selectedEvent.startDate || selectedEvent.date;
                          if (!dStr) return 'TBA';
                          const d = new Date(dStr);
                          return isNaN(d.getTime()) ? dStr : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        })()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-1">
                        <Users className="w-3 h-3" /> Capacity
                      </label>
                      <p className="text-sm text-[var(--fg)]">{selectedEvent.ticketsSold} / {selectedEvent.totalTickets} tickets sold</p>
                      <div className="w-full bg-[var(--bg)] h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--gold)] transition-all" style={{ width: `${selectedEvent.totalTickets > 0 ? Math.min((selectedEvent.ticketsSold / selectedEvent.totalTickets) * 100, 100) : 0}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Ticket Price
                      </label>
                      <p className="text-sm text-[var(--fg)] font-bold">
                        {(selectedEvent.ticketPrice ?? selectedEvent.price ?? 0) > 0
                          ? `${selectedEvent.currency === 'USD' ? '$' : '₹'}${Number(selectedEvent.ticketPrice ?? selectedEvent.price).toLocaleString()}`
                          : 'Free'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Revenue
                      </label>
                      <p className="text-sm text-[var(--fg)] font-bold">
                        {selectedEvent.currency === 'USD' ? '$' : '₹'}{selectedEvent.revenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Venue
                      </label>
                      <p className="text-sm text-[var(--fg)] truncate">
                        {typeof selectedEvent.venue === 'string'
                          ? selectedEvent.venue
                          : (selectedEvent.venue?.name || selectedEvent.venue?.address || 'TBD')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Status
                      </label>
                      <span className={`inline-block px-2 py-0.5 text-[10px] uppercase tracking-widest border rounded ${
                        selectedEvent.status === 'upcoming' ? 'border-green-500 text-green-500 bg-green-500/10' :
                        selectedEvent.status === 'ongoing' ? 'border-blue-500 text-blue-500 bg-blue-500/10' :
                        'border-gray-500 text-gray-500 bg-gray-500/10'
                      }`}>
                        {selectedEvent.status}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[var(--gold)] uppercase tracking-widest font-bold">Event Link</label>
                      <Link
                        href={`/events/${selectedEvent.slug || selectedEvent.id}`}
                        target="_blank"
                        className="text-sm text-[var(--primary)] hover:text-[var(--primary-light)] underline underline-offset-2 transition-colors"
                      >
                        View Public Page →
                      </Link>
                    </div>
                  </div>
              </div>

              {/* Analytics Component */}
              <AnalyticsDashboard event={selectedEvent as any} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
              <div className="w-24 h-24 border border-[var(--border-subtle)] transform rounded-full flex items-center justify-center mb-8">
                <Calendar className="w-10 h-10 text-[var(--fg-muted)] transform " />
              </div>
              <h2 className="text-2xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">Select an Event</h2>
              <p className="text-[var(--fg-muted)] mt-2">Choose an event from the sidebar to view details</p>
            </div>
          )}
        </main>
      </div>

      {/* In-Page Quick Scanner Modal */}
      <AnimatePresence>
        {showScannerModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowScannerModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Actions */}
              <div className="flex items-center justify-between mb-3 px-1">
                <Link
                  href={`/organizer/scanner?eventId=${selectedEvent.id}`}
                  target="_blank"
                  className="text-[var(--gold)] hover:underline flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider"
                >
                  <span>Fullscreen Scanner</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setShowScannerModal(false)}
                  className="p-1.5 text-gray-400 hover:text-white bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full transition-colors"
                  title="Close Scanner"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR Scanner Component */}
              <QRScanner
                eventId={selectedEvent.id}
                onCheckIn={() => {
                  // Live update event counts on organizer dashboard
                  loadOrganizerEvents(auth.username);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participant Form Fields Modal */}
      {showFieldsModal && selectedEvent && (
        <ParticipantFieldsModal
          isOpen={showFieldsModal}
          onClose={() => setShowFieldsModal(false)}
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          initialFields={selectedEvent.registrationFields}
          onSaved={(newFields) => {
            setSelectedEvent(prev => prev ? { ...prev, registrationFields: newFields } : null);
            setEvents(prev => prev.map(e => e.id === selectedEvent.id ? { ...e, registrationFields: newFields } : e));
          }}
        />
      )}
    </div>
  );
}
