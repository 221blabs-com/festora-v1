/**
 * Event Detail Page - Art Deco Theme
 * Shows all event data collected during creation
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  AlertCircle,
  ArrowLeft,
  Eye,
  X,
  Globe,
  Tag,
  CheckCircle,
  ExternalLink,
  Monitor,
  Home,
  Compass,
  Moon,
  Sun,
  Share2
} from 'lucide-react';
import CheckoutModal from '@/components/events/checkout-modal';
import { formatCurrency } from '@/lib/payment';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/auth-context';
import { Spinner } from '@/components/ui/spinner';

interface EventData {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  ticketPrice?: number;
  price?: number;
  originalPrice?: number;
  isPaid?: boolean;
  currency?: string;
  registeredCount?: number;
  ticketsSold?: number;
  category?: string;
  categories?: string[];
  tags?: string[];
  badges?: string[];
  requirements?: string[];
  agenda?: Array<{
    title: string;
    time: string;
    description?: string;
    speaker?: string;
  }>;
  venue?: string | { name?: string; address?: string };
  venueType?: string;
  virtualLink?: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  dateTime?: {
    startDate: string;
    endDate?: string;
  };
  isTeamEvent?: boolean;
  teamSettings?: {
    minTeamSize?: number;
    maxTeamSize?: number;
    allowIndividual?: boolean;
  };
  capacity?: number;
  totalTickets?: number;
  organizationName?: string;
  organizer?: {
    name?: string;
    email?: string;
    avatar?: string;
  };
  organizationDescription?: string;
  organizerLinks?: {
    website?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
    discord?: string;
    github?: string;
  };
  featured?: boolean;
  [key: string]: unknown;
}

// Helper to format duration between two dates
function formatDuration(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return 'TBA';
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins} min`;
}

// Helper to build full location string
function buildLocationString(event: EventData): string {
  const parts: string[] = [];
  if (typeof event.venue === 'string' && event.venue) parts.push(event.venue);
  else if (typeof event.venue === 'object' && event.venue?.name) parts.push(event.venue.name);
  if (event.location?.address) parts.push(event.location.address);
  if (event.location?.city) parts.push(event.location.city);
  if (event.location?.state) parts.push(event.location.state);
  if (event.location?.country) parts.push(event.location.country);
  return parts.length > 0 ? parts.join(', ') : 'TBA';
}

// Social icon SVGs
const socialIcons: Record<string, React.ReactNode> = {
  instagram: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>,
  linkedin: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
  twitter: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
  youtube: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
  discord: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/></svg>,
  github: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>,
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  const handleGetTickets = () => {
    if (params?.id === 'hyderabad-city-inter-college-sports-quiz-competitions-2026') {
      router.push(`/events/${params.id}/register`);
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      alert("You appear to be offline. Please check your internet connection to book tickets.");
      return;
    }
    if (!authLoading && !user) {
      router.push(`/login?callbackUrl=/events/${params.id}`);
      return;
    }
    setShowCheckout(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      // Toggle compact mode when scrolled past the hero section (approx 400px)
      setIsCompact(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!params?.id) { setError('Event ID not found'); return; }
        setLoading(true);
        const response = await fetch(`/api/events/${params.id}`);
        if (!response.ok) {
          const allEventsResponse = await fetch('/api/events');
          const isWpdParam = typeof params.id === 'string' && params.id.toLowerCase().includes('world-population-day');
          if (allEventsResponse.ok) {
            const data = await allEventsResponse.json();
            const events = data.events || data;
            const eventId = typeof params.id === 'string' && params.id.includes('-') ? params.id.split('-').pop() : params.id;
            const foundEvent = events.find((e: EventData) =>
              e.id === eventId ||
              e.id === params.id ||
              e.slug === params.id ||
              (isWpdParam && (e.slug?.includes('world-population-day') || e.title?.toLowerCase().includes('world population day')))
            );
            if (foundEvent) {
              let processedEvent = { ...foundEvent };
              if (eventId === 'AIGNITE' || params.id === 'aignite-AIGNITE') {
                processedEvent = { ...processedEvent, image: '/AIGNITE.png', isTeamEvent: true, tags: ['AI', 'Hackathon'],
                  teamSettings: { minTeamSize: 2, maxTeamSize: 4, allowIndividual: false }, organizationName: 'MLSC - MRUH',
                  organizationDescription: 'Microsoft Learn Student Chapter at Malla Reddy University',
                  organizerLinks: { website: 'https://www.mlsc-mruh.live/', instagram: 'https://www.instagram.com/mlsc_mruh/',
                    linkedin: 'linkedin.com/company/mlsc-mru/', youtube: 'https://www.youtube.com/@mlsc_mruh' }
                };
              }
              setEvent(processedEvent); return;
            }
          }
          if (typeof params.id === 'string' && params.id.toLowerCase().includes('world-population-day')) {
            setEvent({
              id: 'world-population-day-2026',
              slug: 'world-population-day-2026',
              title: 'World Population Day 2026',
              description: 'Commemorating World Population Day 2026. Register now with your school details.',
              shortDescription: 'World Population Day 2026 Registration',
              startDate: '2026-07-11T10:00:00.000Z',
              endDate: '2026-07-11T17:00:00.000Z',
              dateTime: {
                startDate: '2026-07-11T10:00:00.000Z',
                endDate: '2026-07-11T17:00:00.000Z',
              },
              ticketPrice: 0,
              price: 0,
              isPaid: false,
              isTeamEvent: false,
              category: 'Special Event',
              venue: 'Malla Reddy University Campus',
              organizationName: 'Malla Reddy University',
            });
            return;
          }
          throw new Error('Event not found');
        }
        const data = await response.json();
        let processedEvent = data.event || data;
        if (processedEvent?.id === 'AIGNITE' || params.id === 'aignite-AIGNITE') {
          processedEvent = { ...processedEvent, image: '/AIGNITE.png', isTeamEvent: true, tags: ['AI', 'Hackathon'],
            teamSettings: { minTeamSize: 2, maxTeamSize: 4, allowIndividual: false }, organizationName: 'MLSC - MRUH',
            organizationDescription: 'Microsoft Learn Student Chapter at Malla Reddy University',
            organizerLinks: { website: 'https://www.mlsc-mruh.live/', instagram: 'https://www.instagram.com/mlsc_mruh/',
              linkedin: 'linkedin.com/company/mlsc-mru/', youtube: 'https://www.youtube.com/@mlsc_mruh' }
          };
        }
        setEvent(processedEvent);
      } catch (err) { setError(err instanceof Error ? err.message : 'Failed to load event'); }
      finally { setLoading(false); }
    };
    if (params?.id) fetchEvent();
  }, [params?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-4 font-[family-name:var(--font-josefin)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 text-center max-w-md relative">
          <AlertCircle className="w-16 h-16 text-[var(--primary)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">Event Not Found</h2>
          <p className="text-[var(--fg-muted)] mb-6">{error || 'This event doesn\'t exist.'}</p>
          <Link href="/events" className="btn-primary inline-flex">
            Browse Events
          </Link>
        </motion.div>
      </div>
    );
  }

  // Derived values
  const startDateStr = event.startDate || event.dateTime?.startDate || '';
  const endDateStr = event.endDate || event.dateTime?.endDate || '';
  const eventCapacity = event.capacity || event.totalTickets || 0;
  const ticketsSold = event.ticketsSold || event.registeredCount || 0;
  const eventPrice = event.ticketPrice ?? event.price ?? 0;
  const venueLabel = typeof event.venue === 'string' ? event.venue : event.venue?.name || '';
  const fullLocation = buildLocationString(event);
  const duration = startDateStr && endDateStr ? formatDuration(startDateStr, endDateStr) : 'TBA';
  const activeOrganizerLinks = event.organizerLinks
    ? Object.entries(event.organizerLinks).filter(([, url]) => url && String(url).trim() !== '')
    : [];

  return (
    <>
      <div className="block md:hidden selection:bg-[var(--primary)] selection:text-white font-[family-name:var(--font-josefin)] bg-[var(--bg)] relative pb-4">
        {/* App Header */}
        <header className="fixed top-0 w-full z-50 px-5 pt-8 pb-4 flex items-center justify-between pointer-events-none">
            <Link href="/events" className="w-10 h-10 rounded bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] flex items-center justify-center text-[var(--fg)] pointer-events-auto shadow-md">
                <ArrowLeft className="w-5 h-5" />
            </Link>
            <button className="w-10 h-10 rounded bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-subtle)] flex items-center justify-center text-[var(--fg)] pointer-events-auto shadow-md">
                <Share2 className="w-4 h-4 text-[var(--gold)]" />
            </button>
        </header>

        {/* Main Content */}
        <div className="w-full">
            
            {/* Hero Section */}
            <div className="relative w-full h-[340px] bg-[var(--bg)] border-b border-[var(--border-subtle)] flex flex-col justify-end p-6 overflow-hidden">
                {event.image && event.image !== '/placeholder-event.jpg' ? (
                  <>
                    <Image
                      src={event.image}
                      alt={event.title}
                      fill
                      sizes="100vw"
                      className="object-cover opacity-80 pointer-events-none"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/70 to-transparent pointer-events-none z-0"></div>
                  </>
                ) : (
                  <>
                     <div className="absolute inset-0 bg-pattern opacity-10 pointer-events-none"></div>
                     <div className="absolute inset-0 flex items-center justify-center -translate-y-8 opacity-10 pointer-events-none">
                        <Calendar className="w-48 h-48 text-[var(--gold)]" />
                     </div>
                  </>
                )}
                
                <div className="absolute inset-0 hero-glow pointer-events-none z-0"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center pb-2">
                    <span className="text-[10px] text-[var(--gold)] font-bold uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                        <span className="w-6 h-[1px] bg-[var(--gold)] opacity-50"></span>
                        {event.featured ? 'Featured Event' : 'Event Details'}
                        <span className="w-6 h-[1px] bg-[var(--gold)] opacity-50"></span>
                    </span>
                    <h1 className="font-[family-name:var(--font-marcellus)] text-4xl text-[var(--fg)] uppercase tracking-[0.05em] leading-[1] mb-2 drop-shadow-md">
                        {event.title}
                    </h1>
                </div>
            </div>

            {/* Content Container */}
            <div className="px-5 py-8 space-y-8">
                
                {/* Quick Stats Matrix */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="event-card corner-bracket p-5 flex flex-col items-center gap-1 transition-colors hover:border-[var(--gold)]">
                        <Calendar className="w-5 h-5 text-[var(--gold)] mb-1" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)]">Date</span>
                        <span className="font-[family-name:var(--font-marcellus)] text-base text-[var(--fg)] text-center line-clamp-1">
                          {startDateStr ? new Date(startDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBA'}
                        </span>
                    </div>
                    <div className="event-card corner-bracket p-5 flex flex-col items-center gap-1 transition-colors hover:border-[var(--gold)]">
                        <Clock className="w-5 h-5 text-[var(--gold)] mb-1" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)]">Duration</span>
                        <span className="font-[family-name:var(--font-marcellus)] text-base text-[var(--fg)]">{duration}</span>
                    </div>
                    <div className="event-card corner-bracket p-5 flex flex-col items-center gap-1 transition-colors hover:border-[var(--gold)]">
                        <Users className="w-5 h-5 text-[var(--gold)] mb-1" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)]">Capacity</span>
                        <span className="font-[family-name:var(--font-marcellus)] text-base text-[var(--fg)]">{eventCapacity > 0 ? eventCapacity : 'Max'}</span>
                    </div>
                    <div className="event-card corner-bracket p-5 flex flex-col items-center gap-1 transition-colors hover:border-[var(--gold)]">
                        <Globe className="w-5 h-5 text-[var(--gold)] mb-1" />
                        <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)]">Format</span>
                        <span className="font-[family-name:var(--font-marcellus)] text-base text-[var(--fg)] capitalize">{event.venueType || 'Physical'}</span>
                    </div>
                </div>

                {/* About Section */}
                <div className="space-y-4">
                    <h2 className="font-[family-name:var(--font-marcellus)] text-xl text-[var(--fg)] uppercase tracking-widest flex items-center gap-3">
                        <span className="w-4 h-[1px] bg-[var(--gold)]"></span> About This Event
                    </h2>
                    <div className="event-card corner-bracket p-6 space-y-3">
                        {event.shortDescription && (
                          <h3 className="text-sm font-semibold text-[var(--fg)] leading-snug">
                              {event.shortDescription}
                          </h3>
                        )}
                        <p className="text-xs text-[var(--fg-muted)] leading-relaxed tracking-wide whitespace-pre-wrap">
                            {event.description || 'No description available.'}
                        </p>
                    </div>
                </div>

                {/* Team Info */}
                {event.isTeamEvent && event.teamSettings && (
                  <div className="space-y-4">
                      <h2 className="font-[family-name:var(--font-marcellus)] text-xl text-[var(--fg)] uppercase tracking-widest flex items-center gap-3">
                          <span className="w-4 h-[1px] bg-[var(--gold)]"></span> Team Info
                      </h2>
                      <div className="event-card corner-bracket p-6 space-y-4">
                          <div className="flex justify-between items-center">
                              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">Team Size</span>
                              <span className="font-[family-name:var(--font-marcellus)] text-base text-[var(--gold)]">
                                {event.teamSettings.minTeamSize} - {event.teamSettings.maxTeamSize} members
                              </span>
                          </div>
                          {event.teamSettings.allowIndividual && (
                            <>
                              <div className="w-full h-px bg-[var(--border-subtle)]"></div>
                              <div className="flex justify-between items-center">
                                  <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--fg-muted)]">Solo Entry</span>
                                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary)] bg-[var(--primary)]/10 rounded border border-[var(--primary)]/30 px-3 py-1.5">Allowed</span>
                              </div>
                            </>
                          )}
                      </div>
                  </div>
                )}

                {/* Event Details (Tags, Categories, Req) */}
                {((event.tags && event.tags.length > 0) || (event.categories && event.categories.length > 0) || (event.requirements && event.requirements.length > 0)) && (
                  <div className="space-y-4">
                      <h2 className="font-[family-name:var(--font-marcellus)] text-xl text-[var(--fg)] uppercase tracking-widest flex items-center gap-3">
                          <span className="w-4 h-[1px] bg-[var(--gold)]"></span> Event Details
                      </h2>
                      <div className="event-card corner-bracket p-6 space-y-6">
                          <div className="flex flex-col gap-6 sm:flex-row">
                              {/* Tags */}
                              {event.tags && event.tags.length > 0 && (
                                <div className="w-full sm:w-1/3">
                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)] mb-2">Tags</p>
                                    <div className="flex flex-wrap gap-2">
                                        {event.tags.map(tag => (
                                          <span key={tag} className="px-3 py-1.5 rounded text-[10px] font-semibold tracking-wider bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--primary)] inline-block">
                                            {tag}
                                          </span>
                                        ))}
                                    </div>
                                </div>
                              )}

                              {/* Requirements */}
                              {event.requirements && event.requirements.length > 0 && (
                                <div className="w-full sm:w-2/3">
                                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)] mb-2">Requirements</p>
                                    <div className="flex flex-wrap gap-x-5 gap-y-2">
                                        {event.requirements.map((req, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                              <div className="w-1.5 h-1.5 bg-[var(--gold)] transform rotate-45"></div>
                                              <span className="text-[11px] font-semibold tracking-widest text-[var(--fg)] uppercase">{req}</span>
                                          </div>
                                        ))}
                                    </div>
                                </div>
                              )}
                          </div>

                          {event.categories && event.categories.length > 0 && (
                            <>
                              <div className="w-full h-px bg-[var(--border-subtle)]"></div>
                              <div>
                                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)] mb-3">Categories</p>
                                  <div className="flex flex-wrap gap-2">
                                      {event.categories.map(cat => (
                                        <span key={cat} className="px-3 py-1.5 rounded text-[10px] font-semibold tracking-wider bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--fg)]">
                                          {cat}
                                        </span>
                                      ))}
                                  </div>
                              </div>
                            </>
                          )}
                      </div>
                  </div>
                )}

                {/* Schedule */}
                {event.agenda && event.agenda.length > 0 && (
                  <div className="space-y-4">
                      <h2 className="font-[family-name:var(--font-marcellus)] text-xl text-[var(--fg)] uppercase tracking-widest flex items-center gap-3">
                          <span className="w-4 h-[1px] bg-[var(--gold)]"></span> Itinerary
                      </h2>
                      <div className="event-card corner-bracket p-6">
                          <div className="relative pl-6 space-y-8 border-l border-[var(--border-subtle)] ml-3">
                              {event.agenda.map((item, idx) => (
                                <div key={idx} className="relative">
                                    <div className={`absolute -left-[30px] top-[4px] w-2.5 h-2.5 transform rotate-45 ${idx === 0 ? 'bg-[var(--primary)] shadow-[0_0_8px_rgba(200,16,46,0.6)]' : 'bg-[var(--bg)] border border-[var(--border-subtle)]'}`}></div>
                                    <div className="flex flex-col gap-1.5 mb-1.5">
                                        <span className="text-[10px] font-bold tracking-[0.15em] text-[var(--gold)]">{item.time}</span>
                                        <h4 className="font-[family-name:var(--font-marcellus)] text-lg text-[var(--fg)] uppercase leading-none">{item.title}</h4>
                                    </div>
                                    {item.description && <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest">{item.description}</p>}
                                    {item.speaker && <p className="text-xs text-[var(--gold)] uppercase tracking-widest mt-1">By {item.speaker}</p>}
                                </div>
                              ))}
                          </div>
                      </div>
                  </div>
                )}

                {/* Venue */}
                {(event.location?.address || event.virtualLink) && (
                  <div className="space-y-4">
                      <h2 className="font-[family-name:var(--font-marcellus)] text-xl text-[var(--fg)] uppercase tracking-widest flex items-center gap-3">
                          <span className="w-4 h-[1px] bg-[var(--gold)]"></span> Location
                      </h2>
                      {event.location?.address && (
                        <div className="event-card rounded p-5 flex items-start gap-4">
                            <div className="w-12 h-12 rounded border border-[var(--border-subtle)] bg-[var(--bg)] flex items-center justify-center shrink-0">
                                <MapPin className="w-5 h-5 text-[var(--gold)]" />
                            </div>
                            <div className="flex flex-col justify-center pt-0.5">
                                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)] mb-1">Address</p>
                                <p className="font-[family-name:var(--font-josefin)] text-[12px] text-[var(--fg)] uppercase tracking-[0.1em] leading-relaxed">
                                    {fullLocation}
                                </p>
                            </div>
                        </div>
                      )}
                      
                      {event.virtualLink && (
                        <div className="event-card rounded p-5 flex items-start gap-4">
                            <div className="w-12 h-12 rounded border border-[var(--border-subtle)] bg-[var(--bg)] flex items-center justify-center shrink-0">
                                <Monitor className="w-5 h-5 text-[var(--gold)]" />
                            </div>
                            <div className="flex flex-col justify-center pt-0.5">
                                <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[var(--fg-muted)] mb-1">Virtual Link</p>
                                <a href={event.virtualLink} target="_blank" rel="noopener noreferrer" className="font-[family-name:var(--font-josefin)] text-[12px] text-[var(--primary)] uppercase tracking-[0.1em] leading-relaxed flex items-center gap-1">
                                    Join Online <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Organizer Section */}
                <div className="space-y-4 pb-4">
                    <h2 className="font-[family-name:var(--font-marcellus)] text-xl text-[var(--fg)] uppercase tracking-widest flex items-center gap-3">
                        <span className="w-4 h-[1px] bg-[var(--gold)]"></span> Organizer
                    </h2>
                    
                    <div className="event-card rounded p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 rounded border border-[var(--gold)] flex items-center justify-center text-3xl font-[family-name:var(--font-marcellus)] text-[var(--gold)] bg-[var(--bg)] shrink-0 overflow-hidden">
                                {event.organizer?.avatar ? (
                                  <Image src={event.organizer.avatar} alt="avatar" width={64} height={64} className="w-full h-full object-cover" />
                                ) : (
                                  event.organizationName?.charAt(0) || event.organizer?.name?.charAt(0) || 'E'
                                )}
                            </div>
                            <div className="flex flex-col">
                                <h3 className="font-[family-name:var(--font-marcellus)] text-xl text-[var(--fg)] uppercase leading-none mb-1.5">
                                  {event.organizationName || event.organizer?.name || 'Event Organizer'}
                                </h3>
                                {event.organizer?.email && (
                                  <p className="text-[9px] text-[var(--primary)] uppercase tracking-[0.2em] font-bold line-clamp-1">{event.organizer.email}</p>
                                )}
                                {event.organizationDescription && (
                                  <p className="text-[10px] text-[var(--fg-muted)] uppercase tracking-[0.1em] mt-1 line-clamp-2">{event.organizationDescription}</p>
                                )}
                            </div>
                        </div>

                        {/* Spacious Social Links grid */}
                        {activeOrganizerLinks.length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                              {activeOrganizerLinks.map(([platform, url], index) => {
                                const isLastOdd = activeOrganizerLinks.length % 2 !== 0 && index === activeOrganizerLinks.length - 1;
                                return (
                                  <a key={platform} href={String(url).startsWith('http') ? String(url) : `https://${url}`} target="_blank" rel="noopener noreferrer" className={`rounded bg-[var(--bg)] border border-[var(--border-subtle)] p-3 flex items-center justify-center gap-2 hover:border-[var(--gold)] transition-colors group ${isLastOdd ? 'col-span-2' : ''}`}>
                                      <span className="text-[var(--fg-muted)] group-hover:text-[var(--gold)] flex shrink-0 items-center justify-center">
                                        {socialIcons[platform] || <Globe className="w-3.5 h-3.5" />}
                                      </span>
                                      <span className="text-[9px] uppercase tracking-widest text-[var(--fg)]">{platform}</span>
                                  </a>
                                );
                              })}
                          </div>
                        )}
                    </div>
                </div>

            </div>
        </div>

        {/* FLOATING PRICE BAR (Floating Pill style) */}
        <div className="fixed bottom-[90px] left-4 right-4 z-40 pointer-events-none">
            <div className="bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-subtle)] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] rounded p-3 px-5 flex justify-between items-center pointer-events-auto">
                <div className="flex flex-col">
                    <span className="text-[9px] font-bold tracking-[0.25em] uppercase text-[var(--fg-muted)] mb-0.5">Per Ticket</span>
                    <div className="flex items-baseline gap-2">
                        <span className="font-[family-name:var(--font-marcellus)] text-2xl text-[var(--fg)] leading-none">
                          {eventPrice > 0 ? formatCurrency(eventPrice) : 'Free'}
                        </span>
                        {event.originalPrice && event.originalPrice > eventPrice && (
                          <span className="text-xs text-[var(--primary)] line-through tracking-wider pb-0.5">
                            {formatCurrency(event.originalPrice)}
                          </span>
                        )}
                    </div>
                </div>
                {/* Action Button */}
                <button 
                  onClick={() => setShowCheckout(true)}
                  className="bg-[var(--primary)] text-[var(--fg)] h-[48px] px-8 flex items-center justify-center text-xs uppercase tracking-[0.15em] font-bold rounded shadow-[0_0_20px_var(--primary-glow)] transition-transform active:scale-95"
                >
                    {event.isPaid === false ? 'Register Now' : 'Get Tickets'}
                </button>
            </div>
        </div>
      </div>

      <div className="hidden md:block min-h-screen bg-[var(--bg)] font-[family-name:var(--font-josefin)] text-[var(--fg)] pb-20">
      {/* Pattern Overlay */}
      <div className="fixed inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>

      {/* Hero Section */}
      <div className="relative h-[65vh] md:h-[70vh] bg-[var(--bg-card)] border-b border-[var(--border-subtle)] select-none overflow-hidden">
        {event.image && event.image.trim() !== '' && event.image !== '/placeholder-event.jpg' ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="100vw"
            className="object-cover opacity-40 dark:opacity-60"
            priority
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center -translate-y-10 opacity-10 dark:opacity-20 pointer-events-none">
            <Calendar className="w-64 h-64 text-[var(--gold)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/80 dark:via-[var(--bg)]/60 to-[var(--bg)]/60 dark:to-[var(--bg)]/10 backdrop-blur-sm dark:backdrop-blur-[2px]" />
        
        {/* Top Navigation Link */}
        <div className="absolute top-8 left-4 sm:left-6 lg:left-8 max-w-7xl mx-auto w-full z-20 pointer-events-none">
          <div className="pointer-events-auto">
            <Link href="/events" className="inline-flex items-center text-[var(--primary)] hover:text-[var(--fg)] transition-colors group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              <span className="uppercase tracking-widest text-xs font-bold">Back to Events</span>
            </Link>
          </div>
        </div>

        <div className="absolute inset-0 flex flex-col justify-end pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto z-10">

          {/* Badges & Category */}
          <div className="flex flex-wrap gap-2 mb-4">
             {event.category && (
               <span className="px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)] text-[var(--primary)] text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                 {event.category}
               </span>
             )}
             {event.venueType && (
               <span className="px-3 py-1 rounded-full bg-[var(--navy)]/50 border border-[var(--gold)]/30 text-[var(--gold)] text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                 {event.venueType}
               </span>
             )}
             {event.isPaid === false && (
               <span className="px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)] text-[var(--gold)] text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                 Free Entry
               </span>
             )}
             {event.featured && (
               <span className="px-3 py-1 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)] text-[var(--gold)] text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                 Featured
               </span>
             )}
             {event.isTeamEvent && (
               <span className="px-3 py-1 rounded-full bg-[var(--navy)]/50 border border-[var(--gold)]/30 text-[var(--gold)] text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                 Team Event
               </span>
             )}
             {event.badges?.map((badge) => (
               <span key={badge} className="px-3 py-1 rounded-full bg-[var(--bg-card)]/50 border border-[var(--border-subtle)] text-[var(--fg-muted)] text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                 {badge}
               </span>
             ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide leading-none">
              {event.title}
            </h1>
            <button
               onClick={() => setImageViewerOpen(true)}
               className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[var(--gold)] hover:text-[#FFD700] transition-all duration-300 bg-[var(--bg-card)]/20 backdrop-blur-md hover:scale-110 sm:mb-4 shadow-[0_0_15px_rgba(201,168,76,0.1)] group"
               title="View Full Poster"
            >
               <Eye className="w-4 h-4 group-hover:drop-shadow-[0_0_5px_rgba(201,168,76,0.8)]" />
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-12 text-[var(--fg-muted)] uppercase tracking-wide text-sm font-bold">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[var(--gold)]" />
              <span>
                {startDateStr
                  ? new Date(startDateStr).toLocaleDateString('en-GB', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })
                  : 'Date TBA'
                }
              </span>
            </div>
            
            {(venueLabel || event.location?.city) && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-[var(--gold)]" />
                <span>
                  {venueLabel || event.location?.city || 'TBA'}
                </span>
              </div>
            )}

            {duration !== 'TBA' && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[var(--gold)]" />
                <span>{duration}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">

            {/* Quick Info Grid — lighter border style */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 text-center bg-[var(--bg-card)] border border-[var(--border-subtle)] corner-bracket transition-all hover:border-[var(--gold)]/30 hover:shadow-lg hover:shadow-[var(--gold)]/5">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--gold)] mx-auto mb-2" />
                <p className="text-[var(--fg-muted)] text-[9px] sm:text-[10px] uppercase tracking-widest mb-1">Date</p>
                <p className="text-[var(--fg)] font-bold text-xs sm:text-sm font-[family-name:var(--font-marcellus)]">
                  {startDateStr ? new Date(startDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBA'}
                </p>
              </div>
              <div className="p-4 sm:p-5 text-center bg-[var(--bg-card)] border border-[var(--border-subtle)] corner-bracket transition-all hover:border-[var(--gold)]/30 hover:shadow-lg hover:shadow-[var(--gold)]/5">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--gold)] mx-auto mb-2" />
                <p className="text-[var(--fg-muted)] text-[9px] sm:text-[10px] uppercase tracking-widest mb-1">Duration</p>
                <p className="text-[var(--fg)] font-bold text-xs sm:text-sm font-[family-name:var(--font-marcellus)]">{duration}</p>
              </div>
              <div className="p-4 sm:p-5 text-center bg-[var(--bg-card)] border border-[var(--border-subtle)] corner-bracket transition-all hover:border-[var(--gold)]/30 hover:shadow-lg hover:shadow-[var(--gold)]/5">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--gold)] mx-auto mb-2" />
                <p className="text-[var(--fg-muted)] text-[9px] sm:text-[10px] uppercase tracking-widest mb-1">Capacity</p>
                <p className="text-[var(--fg)] font-bold text-xs sm:text-sm font-[family-name:var(--font-marcellus)]">{eventCapacity > 0 ? eventCapacity : 'Unlimited'}</p>
              </div>
              <div className="p-4 sm:p-5 text-center bg-[var(--bg-card)] border border-[var(--border-subtle)] corner-bracket transition-all hover:border-[var(--gold)]/30 hover:shadow-lg hover:shadow-[var(--gold)]/5">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--gold)] mx-auto mb-2" />
                <p className="text-[var(--fg-muted)] text-[9px] sm:text-[10px] uppercase tracking-widest mb-1">Format</p>
                <p className="text-[var(--fg)] font-bold text-xs sm:text-sm font-[family-name:var(--font-marcellus)] capitalize">{event.venueType || 'Physical'}</p>
              </div>
            </div>

            {/* About Section */}
            <div className="p-5 sm:p-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] corner-bracket">
               <h2 className="text-xl sm:text-2xl font-[family-name:var(--font-marcellus)] uppercase tracking-wider mb-4 sm:mb-6 text-[var(--fg)] border-b border-[var(--border-subtle)] pb-3 sm:pb-4">
                 About This Event
               </h2>
               {event.shortDescription && (
                 <p className="text-[var(--fg)] font-bold text-lg mb-4 leading-relaxed">{event.shortDescription}</p>
               )}
               <div className="prose prose-invert max-w-none text-[var(--fg-muted)] leading-relaxed whitespace-pre-wrap">
                 {event.description || 'No description available.'}
               </div>
            </div>

            {/* Organizer Info — moved to main content */}
            <div className="p-5 sm:p-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] corner-bracket">
              <h2 className="text-xl sm:text-2xl font-[family-name:var(--font-marcellus)] uppercase tracking-wider mb-4 sm:mb-6 text-[var(--fg)] border-b border-[var(--border-subtle)] pb-3 sm:pb-4">Organizer</h2>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Organizer Identity */}
                <div className="flex items-start gap-4 flex-1">
                   <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 bg-[var(--bg)] border border-[var(--gold)] shadow-[0_0_10px_var(--gold-glow)] rounded-full flex items-center justify-center overflow-hidden">
                      {event.organizer?.avatar ? (
                        <Image src={event.organizer.avatar} alt="avatar" width={56} height={56} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[var(--gold)] font-bold text-xl sm:text-2xl">
                          {event.organizationName?.charAt(0) || event.organizer?.name?.charAt(0) || 'E'}
                        </span>
                      )}
                   </div>
                   <div className="flex-1">
                      <p className="font-bold text-[var(--fg)] text-sm sm:text-base uppercase tracking-wide font-[family-name:var(--font-marcellus)]">
                         {event.organizationName || event.organizer?.name || 'Event Organizer'}
                      </p>
                      {event.organizer?.email && (
                        <p className="text-[var(--fg-muted)] text-[10px] sm:text-xs mt-1">{event.organizer.email}</p>
                      )}
                      {event.organizationDescription && (
                        <p className="text-[var(--fg-muted)] text-xs sm:text-sm mt-2 sm:mt-3 leading-relaxed">{event.organizationDescription}</p>
                      )}
                   </div>
                </div>

                {/* Social Links — right side */}
                {activeOrganizerLinks.length > 0 && (
                  <div className="md:border-l md:border-[var(--border-subtle)] md:pl-6 shrink-0 mt-4 md:mt-0 pt-4 md:pt-0 border-t border-[var(--border-subtle)] md:border-t-0">
                    <p className="text-[10px] sm:text-xs font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-2 sm:mb-3">Connect</p>
                    <div className="grid grid-cols-2 gap-2">
                      {activeOrganizerLinks.map(([platform, url]) => (
                        <a
                          key={platform}
                          href={String(url).startsWith('http') ? String(url) : `https://${url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors text-[10px] sm:text-xs uppercase tracking-wider font-bold"
                        >
                          {socialIcons[platform] || <Globe className="w-3 h-3 sm:w-4 sm:h-4" />}
                          {platform}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Agenda/Schedule */}
            {event.agenda && event.agenda.length > 0 && (
               <div className="p-5 sm:p-8 bg-[var(--bg-card)] border border-[var(--border-subtle)] corner-bracket">
                 <h2 className="text-xl sm:text-2xl font-[family-name:var(--font-marcellus)] uppercase tracking-wider mb-4 sm:mb-6 text-[var(--fg)] border-b border-[var(--border-subtle)] pb-3 sm:pb-4">
                   Event Schedule
                 </h2>
                 <div className="space-y-0">
                    {event.agenda.map((item, idx) => (
                      <div key={idx} className="flex gap-6 group">
                         <div className="w-28 flex-shrink-0 text-[var(--gold)] font-bold text-sm pt-1 text-right pr-4">
                            {item.time}
                         </div>
                         <div className="pb-6 border-l-2 border-[var(--border-subtle)] pl-6 relative flex-1">
                            <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[var(--bg)] border-2 border-[var(--primary)] group-hover:bg-[var(--primary)] transition-colors" />
                            <h3 className="text-base font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide mb-1">
                               {item.title}
                            </h3>
                            {item.speaker && <p className="text-sm text-[var(--gold)] font-bold mb-1">{item.speaker}</p>}
                            {item.description && <p className="text-sm text-[var(--fg-muted)]">{item.description}</p>}
                         </div>
                      </div>
                    ))}
                 </div>
               </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
             {/* Ticket Card */}
             <div className={`bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl sm:rounded-2xl sticky top-24 relative z-10 transition-all duration-300 ease-in-out ${isCompact ? 'p-4 sm:p-5 shadow-md' : 'p-5 sm:p-6 shadow-2xl'}`}>

                <div className={`text-center ${isCompact ? 'mb-4 flex items-center justify-between' : 'mb-8'}`}>
                   {!isCompact && (
                     <p className="text-[var(--fg-muted)] uppercase tracking-widest text-xs mb-2">Ticket Price</p>
                   )}
                   <div className="flex items-center justify-center gap-3">
                     {event.originalPrice && event.originalPrice > eventPrice && (
                       <span className={`${isCompact ? 'text-lg' : 'text-xl'} text-[var(--fg-muted)] line-through font-[family-name:var(--font-marcellus)] transition-all`}>
                         {formatCurrency(event.originalPrice)}
                       </span>
                     )}
                     <div className={`${isCompact ? 'text-2xl' : 'text-4xl'} font-[family-name:var(--font-marcellus)] text-[var(--primary)] font-bold transition-all`}>
                        {eventPrice > 0 ? formatCurrency(eventPrice) : 'Free'}
                     </div>
                   </div>
                   {isCompact && (
                     <p className="text-[var(--fg-muted)] uppercase tracking-widest text-[10px] text-right">Per Ticket</p>
                   )}
                </div>

                <button 
                  onClick={handleGetTickets}
                  className={`btn-primary w-full ${isCompact ? 'py-3 text-sm' : 'py-4 text-base'} mb-2 transition-all`}
                >
                   {event.isPaid === false ? 'Register Now' : 'Get Tickets'}
                </button>

                <AnimatePresence>
                  {!isCompact && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="text-center text-[var(--fg-muted)] text-xs uppercase tracking-wider mb-6 mt-4">
                         {ticketsSold} tickets sold
                      </div>

                      <div className="border-t border-[var(--border-subtle)] pt-6 space-y-4">
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--fg-muted)] flex items-center gap-2">
                               <Clock className="w-4 h-4 text-[var(--gold)]" /> Duration
                            </span>
                            <span className="text-[var(--fg)] font-bold">{duration}</span>
                         </div>
                         <div className="flex items-center justify-between text-sm">
                            <span className="text-[var(--fg-muted)] flex items-center gap-2">
                               <Users className="w-4 h-4 text-[var(--gold)]" /> Capacity
                            </span>
                            <span className="text-[var(--fg)] font-bold">{eventCapacity > 0 ? eventCapacity : 'Unlimited'}</span>
                         </div>
                         {endDateStr && (
                           <div className="flex items-center justify-between text-sm">
                              <span className="text-[var(--fg-muted)] flex items-center gap-2">
                                 <Calendar className="w-4 h-4 text-[var(--gold)]" /> Ends
                              </span>
                              <span className="text-[var(--fg)] font-bold text-xs">
                                {new Date(endDateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                           </div>
                         )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>

             {/* Team Settings */}
             {event.isTeamEvent && event.teamSettings && (
               <div className="p-5 sm:p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl sm:rounded-2xl">
                 <h3 className="text-sm sm:text-base font-[family-name:var(--font-marcellus)] uppercase tracking-wider mb-3 sm:mb-4 text-[var(--fg)] border-b border-[var(--border-subtle)] pb-2 sm:pb-3">
                   Team Info
                 </h3>
                 <div className="space-y-2 sm:space-y-3">
                   <div className="flex justify-between text-xs sm:text-sm">
                     <span className="text-[var(--fg-muted)]">Team Size</span>
                     <span className="text-[var(--fg)] font-bold">{event.teamSettings.minTeamSize} - {event.teamSettings.maxTeamSize} members</span>
                   </div>
                   {event.teamSettings.allowIndividual && (
                     <div className="flex justify-between text-xs sm:text-sm">
                       <span className="text-[var(--fg-muted)]">Solo Entry</span>
                       <span className="text-[var(--gold)] font-bold">Allowed</span>
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Event Details — Tags, Categories, Requirements (sidebar) */}
             {((event.tags && event.tags.length > 0) || (event.categories && event.categories.length > 0) || (event.requirements && event.requirements.length > 0)) && (
               <div className="p-5 sm:p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl sm:rounded-2xl">
                 <h3 className="text-sm sm:text-base font-[family-name:var(--font-marcellus)] uppercase tracking-wider mb-3 sm:mb-4 text-[var(--fg)] border-b border-[var(--border-subtle)] pb-2 sm:pb-3">
                   Event Details
                 </h3>
                 <div className="space-y-4 sm:space-y-5">
                   {event.tags && event.tags.length > 0 && (
                     <div>
                       <p className="text-[9px] sm:text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-2">Tags</p>
                       <div className="flex flex-wrap gap-1.5">
                         {event.tags.map((tag) => (
                           <span key={tag} className="px-2.5 py-1 bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 text-[10px] sm:text-xs font-bold flex items-center gap-1 rounded-full">
                             <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                             {tag}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                   {event.categories && event.categories.length > 0 && (
                     <div>
                       <p className="text-[9px] sm:text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-2">Categories</p>
                       <div className="flex flex-wrap gap-1.5">
                         {event.categories.map((cat) => (
                           <span key={cat} className="px-2.5 py-1 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-full text-[var(--fg-muted)] text-[10px] sm:text-xs uppercase tracking-wider font-bold">
                             {cat}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                   {event.requirements && event.requirements.length > 0 && (
                     <div>
                       <p className="text-[9px] sm:text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-2">Requirements</p>
                       <ul className="space-y-1.5 sm:space-y-2">
                         {event.requirements.map((req, idx) => (
                           <li key={idx} className="flex items-start gap-2">
                             <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[var(--gold)] mt-0.5 shrink-0" />
                             <span className="text-[var(--fg-muted)] text-xs sm:text-sm">{req}</span>
                           </li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
               </div>
             )}

             {/* Venue & Location (sidebar) */}
             {(event.location?.address || event.virtualLink) && (
               <div className="p-5 sm:p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl sm:rounded-2xl">
                 <h3 className="text-sm sm:text-base font-[family-name:var(--font-marcellus)] uppercase tracking-wider mb-3 sm:mb-4 text-[var(--fg)] border-b border-[var(--border-subtle)] pb-2 sm:pb-3">
                   Venue & Location
                 </h3>
                 <div className="space-y-3 sm:space-y-4">
                   {event.location?.address && (
                     <div className="flex items-start gap-2 sm:gap-3 bg-[var(--bg)] p-3 rounded-lg border border-[var(--border-subtle)]">
                       <MapPin className="w-4 h-4 text-[var(--gold)] mt-0.5 shrink-0" />
                       <div>
                         <p className="text-[9px] sm:text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-1">Address</p>
                         <p className="text-[var(--fg)] text-xs sm:text-sm">{fullLocation}</p>
                       </div>
                     </div>
                   )}
                   {event.virtualLink && (
                     <div className="flex items-start gap-2 sm:gap-3 bg-[var(--bg)] p-3 rounded-lg border border-[var(--border-subtle)]">
                       <Monitor className="w-4 h-4 text-[var(--gold)] mt-0.5 shrink-0" />
                       <div>
                         <p className="text-[9px] sm:text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-widest mb-1">Virtual Link</p>
                         <a href={event.virtualLink} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:text-[var(--primary-light)] text-xs sm:text-sm font-bold flex items-center gap-1">
                           Join Online <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                         </a>
                       </div>
                     </div>
                   )}
                 </div>
               </div>
             )}
          </div>

        </div>
      </div>

      </div>

      {/* Modals rendered outside both mobile & desktop divs so they work on all screens */}
      <AnimatePresence>
        {showCheckout && (
          <CheckoutModal
            event={event}
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
          />
        )}

        {imageViewerOpen && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(16px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[100] bg-[var(--bg)]/90 flex flex-col items-center justify-center p-4 sm:p-8 cursor-zoom-out"
            onClick={() => setImageViewerOpen(false)}
          >
             <motion.button
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
               className="absolute top-6 right-6 sm:top-10 sm:right-10 text-[var(--fg-muted)] hover:text-[var(--gold)] px-4 py-2 sm:p-3 sm:px-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--gold)] shadow-xl transition-all flex items-center gap-2 z-50 cursor-pointer hover:scale-105"
             >
               <span className="text-xs uppercase tracking-widest font-bold hidden sm:inline">Close Display</span>
               <X className="w-5 h-5" />
             </motion.button>

             <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative w-full max-w-5xl h-[85vh] flex items-center justify-center cursor-default"
                onClick={(e) => e.stopPropagation()}
             >
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--gold)]/5 to-[var(--primary)]/5 rounded-lg opacity-50 blur-xl"></div>
                <Image
                  src={event.image || '/placeholder-event.jpg'}
                  alt={event.title}
                  fill
                  sizes="100vw"
                  className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-[var(--border-subtle)]/50 rounded-sm z-10"
                  quality={100}
                  priority
                />
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
