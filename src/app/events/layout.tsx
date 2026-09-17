import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Discover Events',
  description: 'Browse and discover campus events near you. Find tech fests, cultural fests, workshops, hackathons, and more. Buy tickets instantly with QR code check-in.',
  keywords: ['discover events', 'campus events', 'college events', 'tech fest', 'cultural fest', 'hackathon', 'workshop', 'student events', 'event tickets'],
  openGraph: {
    title: 'Discover Events | Festora',
    description: 'Browse and discover campus events near you. Buy tickets instantly.',
    type: 'website',
  },
}

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
