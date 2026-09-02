import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Festora is free for attendees. View our transparent pricing for event organizers — no hidden fees, no upfront costs. Pay only when you sell.',
  keywords: ['event ticketing pricing', 'free event tickets', 'organizer pricing', 'ticket selling fees', 'campus event platform pricing'],
  openGraph: {
    title: 'Pricing | Festora',
    description: 'No upfront costs. Festora is free for attendees. Organizers pay only when they sell tickets.',
    type: 'website',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
