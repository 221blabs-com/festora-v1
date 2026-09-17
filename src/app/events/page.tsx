'use client';

import React from 'react';
import { notFound } from 'next/navigation';

import {
  Calendar, MapPin, Users, Share2, Heart,
  ChevronDown, ArrowRight, Star, Sparkles,
  Clock, Zap, CheckCircle2, Ticket, ArrowUpRight, Search
} from 'lucide-react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createSlug } from '@/lib/slug-utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useSearchParams } from 'next/navigation';
import Header from '@/components/header';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Types for our event data
interface Event {
  id: string;
  title: string;
  description: string;
  image: string;
  startDate: string;
  endDate: string;
  dateTime?: {
    startDate: string;
    endDate: string;
  };
  venue: string | { name: string; address: string };
  venueType: 'physical' | 'virtual';
  location?: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  price: number;
  originalPrice: number;
  ticketPrice?: number;
  currency: string;
  category: string;
  categories?: string[];
  organizer: {
    name: string;
    email: string;
    avatar: string;
    verified: boolean;
    id: string;
  };
  organizationName?: string;
  capacity: number;
  registeredCount: number;
  totalTickets?: number;
  ticketsSold?: number;
  capacityLeft?: number;
  badges: string[];
  tags: string[];
  status: string;
  featured: boolean;
  isPaid?: boolean;
  requirements: string[];
  agenda: Array<{ time: string; title: string }>;
  isPastEvent?: boolean;
  isFullyBooked?: boolean;
  shortDescription?: string;
  createdAt: string;
  updatedAt: string;
  // Team event settings
  isTeamEvent?: boolean;
  teamSettings?: {
    minTeamSize: number;
    maxTeamSize: number;
    allowIndividual: boolean;
  };
}

export default function EventsPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
         <div className="text-[var(--primary)] text-center">
           <Spinner />
           <p className="font-[family-name:var(--font-josefin)] uppercase tracking-widest text-sm">Loading Events...</p>
         </div>
       </div>
    }>
      <EventsContent />
    </Suspense>
  );
}

function EventsContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Fetch events
  useEffect(() => {
    async function fetchEvents() {
      try {
        let fetchedEvents: Event[] = [];

        // 1. First attempt to fetch from server route handler (force-dynamic, no-cache)
        try {
          const res = await fetch(`/api/events?limit=100&noCache=true&_t=${Date.now()}`, {
            cache: 'no-store'
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.events || data;
            if (Array.isArray(list) && list.length > 0) {
              fetchedEvents = list;
            }
          }
        } catch (apiErr) {
          console.warn("API events fetch failed, falling back to client Firestore:", apiErr);
        }

        // 2. If API returned no events or failed, fallback to direct Firestore query
        if (fetchedEvents.length === 0) {
          const eventsRef = collection(db, 'events');
          // Fetch published, completed, active, live, upcoming events
          const q = query(eventsRef, where('status', 'in', ['published', 'completed', 'active', 'live', 'upcoming']));
          const snapshot = await getDocs(q);

          fetchedEvents = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Event[];
        }

        fetchedEvents.sort((a: any, b: any) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : (a.dateTime?.startDate ? new Date(a.dateTime.startDate).getTime() : (a.date ? new Date(a.date).getTime() : 0));
          const dateB = b.startDate ? new Date(b.startDate).getTime() : (b.dateTime?.startDate ? new Date(b.dateTime.startDate).getTime() : (b.date ? new Date(b.date).getTime() : 0));
          return dateB - dateA; // Newest date first (descending)
        });

        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, []);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    events.forEach(e => {
      if (e.category) cats.add(e.category);
      if (e.categories) e.categories.forEach(c => cats.add(c));
    });
    return ['All', ...Array.from(cats)].slice(0, 6); // Show top 6 categories
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchQuery = event.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchCategory = selectedCategory === 'All' || event.category === selectedCategory || (event.categories && event.categories.includes(selectedCategory));
      return matchQuery && matchCategory;
    });
  }, [events, searchQuery, selectedCategory]);

  return (
    <div className="min-h-screen bg-[var(--bg)] font-[family-name:var(--font-josefin)]">
       {/* Ornament Lines */}
      <div className="fixed left-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>
      <div className="fixed right-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>
      
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-12">
         {/* Header */}
         <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wider">
               Discover <span className="text-[var(--primary)]">Events</span>
            </h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="h-[1px] w-12 bg-[var(--primary)]"></span>
              <span className="text-[var(--primary)] text-xs uppercase tracking-widest">Curated for You</span>
              <span className="h-[1px] w-12 bg-[var(--primary)]"></span>
            </div>
            
            {/* Search & Filter */}
            <div className="w-full max-w-3xl mx-auto mb-10 px-4">
              <div className="relative w-full shadow-lg shadow-black/20 group">
                <input 
                  type="text" 
                  placeholder="Search for an organizer, topic, or event name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-6 py-4 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--gold)] text-[var(--fg)] placeholder-[var(--fg-muted)] rounded-xl outline-none transition-all pr-14 text-sm sm:text-base font-medium shadow-inner"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-[var(--primary)] text-white rounded-lg opacity-80 group-focus-within:opacity-100 transition-opacity">
                   <Search className="w-4 h-4" />
                </div>
              </div>
              
              <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x justify-start md:justify-center items-center px-1 mask-linear-fade">
                  {uniqueCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-5 py-2 text-xs uppercase tracking-wider font-semibold border rounded-full transition-all snap-center shadow-sm ${
                        selectedCategory === cat 
                        ? 'bg-[var(--gold)] text-[var(--navy)] border-[var(--gold)] shadow-[0_0_15px_var(--gold-glow)]' 
                        : 'bg-[var(--bg)] text-[var(--fg-muted)] border-[var(--border-subtle)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
              </div>
            </div>
         </div>
         
         {/* Events Grid */}
         {loading ? (
           <div className="flex justify-center items-center py-20 min-h-[400px]">
          <div className="text-center">
             <Spinner size="lg" />
             <p className="text-[var(--fg-muted)] font-[family-name:var(--font-josefin)] uppercase tracking-widest text-sm mt-4">Discovering Events...</p>
          </div>
        </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map(event => (
                <Link href={`/events/${(event as { slug?: string }).slug || event.id}`} key={event.id} className="block group">
                  <article className="event-card corner-bracket h-full flex flex-col relative bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 transition-all duration-300 hover:border-[var(--gold)] hover:shadow-[0_0_20px_var(--primary-glow)]">
                    <div className="hidden absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="hidden absolute inset-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>

                    <div className="relative aspect-video mb-4 overflow-hidden border border-[var(--border-subtle)]">
                      {event.image && event.image !== '/placeholder-event.jpg' ? (
                        <Image 
                          src={event.image} 
                          alt={event.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-[var(--bg)] flex items-center justify-center transition-transform duration-700 group-hover:scale-110">
                          <Calendar className="w-16 h-16 text-[var(--gold)] opacity-50" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-[var(--bg)] text-[var(--primary)] px-2 py-1 text-xs font-bold uppercase tracking-widest border border-[var(--primary)]">
                         {new Date(event.startDate || event.dateTime?.startDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[var(--primary)] text-xs uppercase tracking-widest font-bold">
                           {event.category || 'Event'}
                        </span>
                        {(!event.isPaid || (event.ticketPrice ?? event.price) === 0) ? (
                           <span className="text-[var(--gold)] text-xs uppercase tracking-widest font-bold">Free</span>
                        ) : (
                           <span className="text-[var(--fg)] text-xs uppercase tracking-widest font-bold">
                             {event.currency === 'INR' ? '₹' : '$'}{event.ticketPrice ?? event.price}
                           </span>
                        )}
                      </div>
                      
                      <h3 className="card-title text-xl mb-2 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      
                      <div className="flex items-center text-[var(--fg-muted)] text-sm mb-4">
                        <MapPin className="w-3 h-3 mr-1" />
                        <span className="truncate">{typeof event.venue === 'string' ? event.venue : event.venue?.name}</span>
                      </div>
                      
                      <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex justify-between items-center text-xs text-[var(--fg-muted)] uppercase tracking-wide">
                         <span>{typeof event.organizer === 'object' ? event.organizer?.name : event.organizer}</span>
                         <ArrowUpRight className="w-3 h-3 group-hover:text-[var(--primary)] transition-colors" />
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
         )}
         
         {!loading && filteredEvents.length === 0 && (
            <div className="text-center py-20">
               <div className="w-16 h-16 rounded-full border border-[var(--fg-muted)] flex items-center justify-center mx-auto mb-6">
                 <Calendar className="w-8 h-8 text-[var(--fg-muted)]" />
               </div>
               <h3 className="text-xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2">No Events Found</h3>
               <p className="text-[var(--fg-muted)]">Try adjusting your filters or search.</p>
            </div>
         )}
       </div>
    </div>
  );
}
