import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://festora.com'

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/events', '/events/*', '/pricing', '/contact', '/organizer/apply', '/privacy', '/terms', '/refunds'],
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/organizer/scanner',
          '/organizer/events',
          '/onboarding/',
          '/order/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
