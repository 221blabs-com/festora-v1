import type { Metadata } from 'next'
import React from 'react'
import { Josefin_Sans, Marcellus } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/theme-provider'
import { AuthProvider } from '@/contexts/auth-context'
import Header from '@/components/header'
import Footer from '@/components/footer'
import MobileNav from '@/components/mobile-nav'
import { LenisProvider } from '@/components/lenis-provider'

import { ScrollToTop } from '@/components/scroll-to-top'

const josefinSans = Josefin_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-josefin',
  display: 'swap',
})

const marcellus = Marcellus({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marcellus',
  display: 'swap',
})

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://festora.com'

export const metadata: Metadata = {
  title: {
    default: 'Festora - Campus Event Ticketing & Management',
    template: '%s | Festora',
  },
  description: 'Festora is the premier campus event ticketing and management platform. Discover college and university events, buy tickets instantly, and attend with QR code check-in. Organizers can create events, sell tickets, manage registrations, and track attendance in real time.',
  keywords: [
    'campus events', 'college event ticketing', 'university events', 'student events',
    'event management platform', 'QR code tickets', 'event registration', 'buy event tickets',
    'online ticketing', 'campus life', 'tech fest', 'cultural fest', 'college fests',
    'event organizer', 'ticket booking', 'Festora'
  ],
  authors: [{ name: 'Festora', url: baseUrl }],
  creator: 'Festora',
  publisher: 'Festora',
  metadataBase: new URL(baseUrl),
  alternates: {
    canonical: baseUrl,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: baseUrl,
    siteName: 'Festora',
    title: 'Festora - Campus Event Ticketing & Management',
    description: 'Discover extraordinary campus events, buy tickets instantly, and check in with QR codes. The all-in-one platform for college event organizers and attendees.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Festora - Campus Event Ticketing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Festora - Campus Event Ticketing & Management',
    description: 'Discover extraordinary campus events, buy tickets instantly, and check in with QR codes.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'technology',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${josefinSans.variable} ${marcellus.variable}`} suppressHydrationWarning>
      <body className="font-josefin bg-[#090909] text-ivory min-h-screen">
        <LenisProvider>
          <ThemeProvider>
            <AuthProvider>
              <ScrollToTop />
              <Header />
              <main className="flex-grow pt-0 md:pt-16 sm:pt-20 pb-[80px] md:pb-0">
                {children}
              </main>
              <Footer />
              <MobileNav />
            </AuthProvider>
          </ThemeProvider>
        </LenisProvider>
      </body>
    </html>
  )
}

