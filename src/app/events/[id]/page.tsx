import type { Metadata } from 'next';
import { db } from '@/lib/firebase-admin';
import EventDetailClient from './event-detail-client';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://festora.com';

interface EventSeoData {
  title?: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  startDate?: string;
  endDate?: string;
  dateTime?: { startDate?: string; endDate?: string };
  venue?: string | { name?: string; address?: string };
  location?: { address?: string; city?: string; country?: string };
  price?: number;
  ticketPrice?: number;
  isPaid?: boolean;
  currency?: string;
  organizer?: { name?: string };
  organizationName?: string;
  category?: string;
  status?: string;
  slug?: string;
}

async function fetchEventForSeo(id: string): Promise<(EventSeoData & { id: string }) | null> {
  if (!db) return null;
  try {
    const directDoc = await db.collection('events').doc(id).get();
    if (directDoc.exists) {
      return { id: directDoc.id, ...(directDoc.data() as EventSeoData) };
    }
    const slugQuery = await db.collection('events').where('slug', '==', id).limit(1).get();
    if (!slugQuery.empty) {
      const doc = slugQuery.docs[0];
      return { id: doc.id, ...(doc.data() as EventSeoData) };
    }
  } catch {
    // Fall through to generic metadata - the client component has its own
    // richer fallback/lookup logic and will render its own not-found state.
  }
  return null;
}

function venueToString(venue?: string | { name?: string; address?: string }): string | undefined {
  if (!venue) return undefined;
  if (typeof venue === 'string') return venue;
  return venue.name || venue.address;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await fetchEventForSeo(id);

  if (!event) {
    return {
      title: 'Event',
      description: 'Discover this event on Festora - the premier campus event ticketing and management platform.',
    };
  }

  const title = event.title || 'Event';
  const description =
    event.shortDescription ||
    event.description?.slice(0, 160) ||
    `${title} on Festora - discover details, tickets and registration.`;
  const venue = venueToString(event.venue);
  const image = event.image && event.image.trim() !== '' ? event.image : '/og-image.png';
  const canonicalPath = `/events/${event.slug || event.id}`;

  return {
    title,
    description,
    alternates: {
      canonical: `${baseUrl}${canonicalPath}`,
    },
    openGraph: {
      type: 'article',
      url: `${baseUrl}${canonicalPath}`,
      siteName: 'Festora',
      title: `${title} | Festora`,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Festora`,
      description,
      images: [image],
    },
    other: venue ? { 'event:location': venue } : undefined,
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await fetchEventForSeo(id);

  const jsonLd = event
    ? {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: event.title,
        description: event.shortDescription || event.description,
        startDate: event.startDate || event.dateTime?.startDate,
        endDate: event.endDate || event.dateTime?.endDate,
        eventStatus:
          event.status === 'completed'
            ? 'https://schema.org/EventScheduled'
            : event.status === 'cancelled'
              ? 'https://schema.org/EventCancelled'
              : 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: venueToString(event.venue) || 'Venue TBA',
          address: event.location?.address || venueToString(event.venue),
        },
        image: event.image && event.image.trim() !== '' ? [`${baseUrl}${event.image.startsWith('http') ? '' : event.image}`] : [`${baseUrl}/og-image.png`],
        organizer: {
          '@type': 'Organization',
          name: event.organizationName || event.organizer?.name || 'Festora',
        },
        offers: {
          '@type': 'Offer',
          price: event.ticketPrice ?? event.price ?? 0,
          priceCurrency: event.currency || 'INR',
          availability:
            event.status === 'completed' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          url: `${baseUrl}/events/${event.slug || event.id}`,
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <EventDetailClient />
    </>
  );
}
