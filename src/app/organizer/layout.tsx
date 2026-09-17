import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Become an Organizer',
  description: 'Apply to become a Festora event organizer. Create events, sell tickets, and manage attendees for your college or university fest.',
  keywords: ['event organizer', 'sell tickets', 'create events', 'college fest organizer', 'campus event management'],
  openGraph: {
    title: 'Become an Organizer | Festora',
    description: 'Apply to create and manage events on Festora. Sell tickets and manage attendees for your campus fest.',
    type: 'website',
  },
}

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
