import React from 'react';
import dynamic from 'next/dynamic';

import Hero from '@/components/Hero';

// Dynamically import below-the-fold sections to boost initial load time
const FeaturesSection = dynamic(() => import('@/components/home/FeaturesSection'), {
  loading: () => <div className="py-16 min-h-[300px]" />,
});
const HowItWorksSection = dynamic(() => import('@/components/home/HowItWorksSection'), {
  loading: () => <div className="py-16 min-h-[300px]" />,
});
const BenefitsBanner = dynamic(() => import('@/components/home/BenefitsBanner'));
const FAQSection = dynamic(() => import('@/components/home/FAQSection'));
const CTASection = dynamic(() => import('@/components/home/CTASection'));

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://festora.com';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': `${baseUrl}/#website`,
      url: baseUrl,
      name: 'Festora',
      description: 'Campus event ticketing and management platform for colleges and universities.',
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${baseUrl}/events?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'Organization',
      '@id': `${baseUrl}/#organization`,
      name: 'Festora',
      url: baseUrl,
      logo: { '@type': 'ImageObject', url: `${baseUrl}/og-image.png` },
      description:
        'Festora is the premier campus event ticketing and management platform. Students discover events, buy tickets, and check in with QR codes. Organizers create events, sell tickets, and track attendance in real time.',
      sameAs: [],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col">
        <Hero />
        <FeaturesSection />
        <HowItWorksSection />
        <BenefitsBanner />
        <FAQSection />
        <CTASection />
      </div>
    </>
  );
}
