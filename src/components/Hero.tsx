'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Info, MapPin, Ticket, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import GlassIcons, { type GlassIconsItem } from '@/components/ui/glass-icons';

interface FeaturedEvent {
  id: string;
  slug?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  bannerImage?: string;
  coverImage?: string;
  category?: string;
  name?: string;
  startDate?: string;
  date?: string;
  dateTime?: { startDate?: string };
  venue?: { name?: string } | string;
  ticketsSold?: number;
  registeredCount?: number;
  isSample?: boolean;
}

const SAMPLE_EVENT: FeaturedEvent = {
  id: '',
  title: 'AIGNITE Campus Festival',
  description: 'A high-energy celebration of music, creativity, and campus culture. This sample shows how featured events will appear.',
  image: '/sample-campus-festival.png',
  category: 'Music & Culture',
  venue: 'Your campus',
  isSample: true,
};

function getStartDate(event: FeaturedEvent) {
  const date = event.dateTime?.startDate || event.startDate || event.date;
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getEventHref(event: FeaturedEvent) {
  return `/events/${event.slug || event.id}`;
}

export default function Hero() {
  const [events, setEvents] = useState<FeaturedEvent[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSampleInfoOpen, setIsSampleInfoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPopularEvents() {
      try {
        const response = await fetch('/api/events?limit=5&sort=popular&upcoming=true', {
          cache: 'no-store',
        });
        if (!response.ok) return;

        const data = await response.json();
        if (!cancelled && Array.isArray(data.events)) {
          setEvents(data.events);
        }
      } catch (error) {
        console.error('Could not load popular events for the homepage:', error);
      }
    }

    loadPopularEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const event = events[activeIndex] || SAMPLE_EVENT;
  const eventImage = event?.image || event?.bannerImage || event?.coverImage;
  const eventTitle = event?.title || event?.name;
  const eventDate = event ? getStartDate(event) : null;
  const eventVenue = typeof event?.venue === 'string' ? event.venue : event?.venue?.name;
  const description = (event?.shortDescription || event?.description || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const previewActions: GlassIconsItem[] = [
    {
      label: 'Buy Tickets',
      icon: <Ticket className="h-5 w-5" />,
      color: 'red',
      href: event.isSample ? '/events' : `${getEventHref(event)}?book=true`,
    },
    event.isSample
      ? {
          label: 'More Info',
          icon: <Info className="h-5 w-5" />,
          color: 'glass',
          onClick: () => setIsSampleInfoOpen(true),
        }
      : {
          label: 'More Info',
          icon: <Info className="h-5 w-5" />,
          color: 'glass',
          href: getEventHref(event),
        },
  ];

  const moveFeaturedEvent = (direction: -1 | 1) => {
    setActiveIndex((current) => (current + direction + events.length) % events.length);
  };

  return (
    <section className="relative isolate -mt-[72px] flex min-h-screen items-center overflow-hidden bg-[var(--bg)] pt-[72px] text-[var(--fg)]">
      {eventImage && (
        <Image
          key={eventImage}
          src={eventImage}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="-z-20 object-cover object-center"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--hero-shade-left)_0%,var(--hero-shade-mid)_34%,var(--hero-shade-right)_68%,transparent_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(0deg,var(--hero-shade-bottom)_0%,transparent_48%,var(--hero-shade-top)_100%)]" />

      <div className="flex w-full items-center px-6 pb-28 pt-16 sm:px-10 md:px-12 lg:px-16">
        <div className="max-w-2xl -translate-y-5 md:-translate-y-[6vh]">
          <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-[var(--primary-light)] sm:text-sm">
            <span className="h-px w-8 bg-[var(--primary-light)]" />
            {event.isSample ? 'Sample Preview' : 'Most Popular Event'}
            {event?.category && <span className="text-[var(--fg-muted)]">· {event.category}</span>}
          </p>

          <h1 className="max-w-3xl font-[family-name:var(--font-marcellus)] text-4xl font-bold uppercase leading-[1.04] tracking-wide text-[var(--fg)] drop-shadow-lg sm:text-6xl lg:text-7xl">
            {eventTitle || 'Find Your Next Great Event'}
          </h1>

          {(eventDate || eventVenue) && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[var(--fg)] sm:text-base">
              {eventDate && <span>{eventDate.toLocaleDateString(undefined, { dateStyle: 'long' })}</span>}
              {eventVenue && (
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[var(--primary-light)]" />
                  {eventVenue}
                </span>
              )}
            </div>
          )}

          <p className="mt-5 line-clamp-3 max-w-xl text-base leading-relaxed text-[var(--fg-muted)] sm:text-lg">
            {description || 'Discover exciting campus events, meet your community, and save your place at the experiences everyone is talking about.'}
          </p>

          <GlassIcons items={previewActions} className="mt-8" />

          {events.length > 1 && (
            <div className="mt-10 flex items-center gap-4" aria-label="Popular event previews">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                {String(activeIndex + 1).padStart(2, '0')} / {String(events.length).padStart(2, '0')}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveFeaturedEvent(-1)}
                  aria-label="Previous popular event"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--fg)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => moveFeaturedEvent(1)}
                  aria-label="Next popular event"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--fg)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="hidden max-w-[280px] truncate text-sm text-[var(--fg-muted)] sm:block">
                {events[activeIndex]?.title || events[activeIndex]?.name}
              </div>
            </div>
          )}
        </div>
      </div>
      {isSampleInfoOpen && event.isSample && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sample-event-title"
            className="relative w-full max-w-lg rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7 text-[var(--fg)] shadow-2xl sm:p-9"
          >
            <button
              type="button"
              onClick={() => setIsSampleInfoOpen(false)}
              aria-label="Close event information"
              className="absolute right-4 top-4 rounded-full p-2 text-[var(--fg-muted)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--fg)]"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--primary)]">Sample event</p>
            <h2 id="sample-event-title" className="mb-4 font-[family-name:var(--font-marcellus)] text-3xl font-bold uppercase">
              {eventTitle}
            </h2>
            <p className="leading-relaxed text-[var(--fg-muted)]">{description}</p>
            <Link
              href="/events"
              className="mt-7 inline-flex h-11 items-center rounded-md bg-[var(--primary)] px-6 text-sm font-bold uppercase tracking-wider text-white hover:bg-[var(--primary-light)]"
              onClick={() => setIsSampleInfoOpen(false)}
            >
              Browse real events
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
