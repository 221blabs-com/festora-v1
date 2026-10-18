'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Ticket,
  User,
  Search,
  ArrowUpRight,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { TiltCard } from '@/components/ui/tilt-card';

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ticketCount, setTicketCount] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/tickets/user', {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setTicketCount(Array.isArray(data.tickets) ? data.tickets.length : 0);
      } catch {
        // Silent - the count is a nice-to-have, not critical path.
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const cards = [
    {
      href: '/dashboard/tickets',
      icon: Ticket,
      title: 'My Tickets',
      desc: ticketCount === null
        ? 'View purchased tickets and access your event passes.'
        : ticketCount === 0
          ? "You haven't booked anything yet — your passes will land here."
          : `${ticketCount} ticket${ticketCount === 1 ? '' : 's'} ready to go.`,
      cta: 'View Tickets',
      color: 'gold' as const,
      badge: ticketCount !== null && ticketCount > 0 ? String(ticketCount) : undefined,
    },
    {
      href: '/events',
      icon: Search,
      title: 'Find Events',
      desc: "Discover what's live on campus right now.",
      cta: 'Browse Catalog',
      color: 'primary' as const,
    },
    {
      href: '/dashboard/profile',
      icon: User,
      title: 'My Profile',
      desc: 'Update your personal details and account preferences.',
      cta: 'Manage Account',
      color: 'gold' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] font-[family-name:var(--font-josefin)]">
      <div className="fixed inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>
      <div className="fixed left-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>
      <div className="fixed right-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <p className="text-[var(--gold)] text-xs uppercase tracking-[0.3em] mb-3">{timeGreeting()}</p>
          <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wider">
            {user.email?.split('@')[0]}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <span className="h-[1px] w-12 bg-[var(--primary)]"></span>
            <span className="text-[var(--fg-muted)] text-xs uppercase tracking-widest">Your Festora dashboard</span>
            <span className="h-[1px] w-12 bg-[var(--primary)]"></span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {cards.map((card, i) => {
            const Icon = card.icon;
            const accent = card.color === 'gold' ? 'var(--gold)' : 'var(--primary)';
            return (
              <motion.div
                key={card.href}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <TiltCard maxTilt={6} lift={8} className="h-full rounded-xl">
                  <Link href={card.href} className="group block h-full">
                    <div
                      className="relative bg-[var(--bg-card)] border h-full flex flex-col items-center text-center p-8 transition-all duration-300 corner-bracket overflow-hidden"
                      style={{ borderColor: `color-mix(in srgb, ${accent} 35%, transparent)` }}
                    >
                      {card.badge && (
                        <span className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[var(--gold)] text-[var(--navy)] text-xs font-bold flex items-center justify-center">
                          {card.badge}
                        </span>
                      )}
                      <div
                        className="w-16 h-16 mb-6 rounded-full border flex items-center justify-center transition-colors"
                        style={{ borderColor: accent }}
                      >
                        <Icon className="w-8 h-8" style={{ color: accent }} />
                      </div>
                      <h2 className="text-xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-3 uppercase tracking-wide transition-colors">
                        {card.title}
                      </h2>
                      <p className="text-[var(--fg-muted)] text-sm leading-relaxed mb-6">
                        {card.desc}
                      </p>
                      <span
                        className="mt-auto inline-flex items-center gap-1.5 text-xs uppercase tracking-widest border-b pb-1 group-hover:gap-2.5 transition-all"
                        style={{ color: accent, borderColor: accent }}
                      >
                        {card.cta}
                        <ArrowUpRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                </TiltCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
