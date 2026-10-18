'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Calendar, MapPin, ArrowUpRight, PartyPopper } from 'lucide-react';
import { TiltCard } from '@/components/ui/tilt-card';

interface FeaturedEvent {
  id: string;
  slug?: string;
  title: string;
  image?: string;
  startDate?: string;
  dateTime?: { startDate?: string };
  venue?: string | { name?: string; address?: string };
  category?: string;
  price?: number;
  ticketPrice?: number;
  isPaid?: boolean;
  currency?: string;
  status?: string;
}

function eventDate(e: FeaturedEvent): number {
  const raw = e.startDate || e.dateTime?.startDate;
  return raw ? new Date(raw).getTime() : 0;
}

export default function FeaturedEventsSection() {
  const [events, setEvents] = useState<FeaturedEvent[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/events?limit=50&noCache=true', { cache: 'no-store' });
        if (!res.ok) throw new Error('bad status');
        const data = await res.json();
        const list: FeaturedEvent[] = Array.isArray(data.events) ? data.events : Array.isArray(data) ? data : [];
        if (!cancelled) setEvents(list);
      } catch {
        if (!cancelled) setEvents([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (events === null) {
    return (
      <section className="py-14 sm:py-20 bg-[var(--bg)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const now = Date.now();
  const upcoming = events
    .filter((e) => e.status !== 'rejected' && e.status !== 'pending')
    .sort((a, b) => {
      const aLive = eventDate(a) >= now;
      const bLive = eventDate(b) >= now;
      if (aLive !== bLive) return aLive ? -1 : 1;
      return aLive ? eventDate(a) - eventDate(b) : eventDate(b) - eventDate(a);
    })
    .slice(0, 3);

  return (
    <section className="py-14 sm:py-20 md:py-24 bg-[var(--bg)] relative overflow-hidden">
      <div className="absolute top-1/3 -right-20 w-72 h-72 bg-[var(--primary)]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-14">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[var(--primary)] text-xs uppercase tracking-[0.25em] font-bold mb-3"
            >
              On Campus Right Now
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl sm:text-4xl md:text-5xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)]"
            >
              What&apos;s Happening
            </motion.h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Link
              href="/events"
              className="group inline-flex items-center gap-2 text-sm uppercase tracking-widest font-semibold text-[var(--fg)] hover:text-[var(--primary)] transition-colors"
            >
              See all events
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {upcoming.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="corner-bracket border border-[var(--border-subtle)] bg-[var(--bg-card)] rounded-2xl py-16 px-6 text-center"
          >
            <div className="w-14 h-14 rounded-full border border-[var(--gold)]/40 flex items-center justify-center mx-auto mb-5">
              <PartyPopper className="w-6 h-6 text-[var(--gold)]" />
            </div>
            <h3 className="text-xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2">
              Nothing live this minute
            </h3>
            <p className="text-[var(--fg-muted)] max-w-md mx-auto mb-6">
              The next one is always close — clubs and departments are setting up listings as we speak. Check back soon, or get yours on the calendar.
            </p>
            <Link href="/organizer/apply" className="btn-primary inline-flex px-6 py-3">
              List Your Event
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {upcoming.map((event, index) => {
              const dateVal = eventDate(event);
              const venueLabel = typeof event.venue === 'string' ? event.venue : event.venue?.name || event.venue?.address;
              const isFree = !event.isPaid || (event.ticketPrice ?? event.price ?? 0) === 0;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
                >
                  <TiltCard maxTilt={5} lift={8} className="h-full rounded-2xl">
                    <Link href={`/events/${event.slug || event.id}`} className="block group h-full">
                      <article className="corner-bracket h-full flex flex-col relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-2xl overflow-hidden hover:border-[var(--gold)] transition-all duration-300 hover:shadow-[0_0_30px_var(--primary-glow)]">
                        <div className="relative aspect-[4/3] overflow-hidden">
                          {event.image && event.image !== '/placeholder-event.jpg' ? (
                            <Image
                              src={event.image}
                              alt={event.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--navy)] to-[var(--bg-card)] flex items-center justify-center">
                              <Calendar className="w-12 h-12 text-[var(--gold)] opacity-50" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                          <div className="absolute top-3 left-3 bg-[var(--bg)]/90 backdrop-blur-sm text-[var(--primary)] px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest rounded-md border border-[var(--primary)]/30">
                            {dateVal ? new Date(dateVal).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'TBA'}
                          </div>
                          <div className="absolute top-3 right-3 bg-[var(--bg)]/90 backdrop-blur-sm px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-widest rounded-md border border-[var(--border-subtle)]">
                            {isFree ? <span className="text-[var(--gold)]">Free</span> : <span className="text-[var(--fg)]">{event.currency === 'INR' ? '₹' : '$'}{event.ticketPrice ?? event.price}</span>}
                          </div>
                          <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="text-white font-[family-name:var(--font-marcellus)] text-lg leading-snug line-clamp-2">
                              {event.title}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 mt-auto">
                          <div className="flex items-center gap-1.5 text-[var(--fg-muted)] text-xs min-w-0">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{venueLabel || 'Campus'}</span>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-[var(--fg-muted)] group-hover:text-[var(--primary)] shrink-0 transition-colors" />
                        </div>
                      </article>
                    </Link>
                  </TiltCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
