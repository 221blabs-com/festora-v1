import type { MetadataRoute } from 'next'
import { db } from '@/lib/firebase-admin'

interface SitemapEventDoc {
  slug?: string
  status?: string
  isPublished?: boolean
  updatedAt?: string
  createdAt?: string
}

async function getEventEntries(baseUrl: string): Promise<MetadataRoute.Sitemap> {
  if (!db) return []
  try {
    const snapshot = await db.collection('events').get()
    return snapshot.docs
      .map((doc: any) => ({ id: doc.id, ...(doc.data() as SitemapEventDoc) }))
      .filter((event: SitemapEventDoc & { id: string }) => event.isPublished !== false && event.status !== 'draft' && event.status !== 'rejected')
      .map((event: SitemapEventDoc & { id: string }) => ({
        url: `${baseUrl}/events/${event.slug || event.id}`,
        lastModified: event.updatedAt || event.createdAt || new Date().toISOString(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }))
  } catch {
    // Keep the static sitemap usable even if Firestore is unreachable at build time
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://festora.com'

  // Use a static date to avoid cache invalidation on every build
  const lastModified = '2024-03-21T00:00:00.000Z'

  const eventEntries = await getEventEntries(baseUrl)

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/events`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/organizer/apply`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/login`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/refunds`,
      lastModified,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...eventEntries,
  ]
}
