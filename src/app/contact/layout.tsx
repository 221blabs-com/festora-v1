import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Contact Enterprise',
  description: 'Connect with the Festora Enterprise team for multi-campus fests, large-scale events, custom ticketing, white-label apps, and dedicated event management.',
  keywords: ['festora enterprise', 'contact festora', 'college event management', 'enterprise ticketing', 'large scale events', 'white label ticketing'],
  openGraph: {
    title: 'Contact Festora Enterprise | Festora',
    description: 'Scale your campus fests and institutional conferences with Festora Enterprise.',
    type: 'website',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
