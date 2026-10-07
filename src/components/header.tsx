'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { LogOut, User } from 'lucide-react';
import CardNav, { type CardNavItem } from '@/components/card-nav';
import ThemeToggle from '@/components/theme-toggle';
import { useAuth } from '@/contexts/auth-context';

export default function Header() {
  const { user, signOut, loading } = useAuth();

  const items = useMemo<CardNavItem[]>(() => {
    const cardColor = 'color-mix(in srgb, var(--bg-card) 88%, var(--primary) 12%)';
    const textColor = 'var(--fg)';

    return [
      {
        label: 'Explore',
        bgColor: 'var(--bg-card)',
        textColor,
        links: [
          { label: 'Home', href: '/', ariaLabel: 'Go to home' },
          { label: 'Discover Events', href: '/events', ariaLabel: 'Discover events' },
        ],
      },
      {
        label: 'Organize',
        bgColor: cardColor,
        textColor,
        links: [
          { label: 'Organizer Dashboard', href: '/organizer', ariaLabel: 'Open organizer dashboard' },
          { label: 'Become an Organizer', href: '/organizer/apply', ariaLabel: 'Apply to become an organizer' },
        ],
      },
      {
        label: 'Account',
        bgColor: 'var(--bg-card-hover)',
        textColor,
        links: user
          ? [
              { label: 'Dashboard', href: '/dashboard', ariaLabel: 'Open your dashboard' },
              { label: 'My Tickets', href: '/dashboard/tickets', ariaLabel: 'View your tickets' },
            ]
          : [
              { label: 'Login', href: '/login', ariaLabel: 'Log in to Festora' },
              { label: 'Create Account', href: '/signup', ariaLabel: 'Create a Festora account' },
            ],
      },
    ];
  }, [user]);

  const headerActions = (
    <>
      <ThemeToggle />
      <div className="hidden items-center gap-3 lg:flex">
        {loading ? (
          <div className="h-9 w-32 animate-pulse rounded-full bg-[var(--fg)]/10" />
        ) : user ? (
          <>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--fg)]/10 bg-[var(--fg)]/5 px-4 text-sm font-semibold text-[var(--fg)] backdrop-blur-lg transition-colors hover:bg-[var(--fg)]/10"
            >
              <User className="h-4 w-4" />
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--fg)]/10 bg-[var(--fg)]/5 px-4 text-sm font-semibold text-[var(--fg)] backdrop-blur-lg transition-colors hover:bg-[var(--fg)]/10"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full border border-[var(--fg)]/10 bg-[var(--fg)]/5 px-4 text-sm font-semibold text-[var(--fg)] backdrop-blur-lg transition-colors hover:bg-[var(--fg)]/10"
            >
              Login
            </Link>
            <Link href="/signup" className="btn-primary inline-flex h-10 items-center px-5 text-xs tracking-[0.16em]">
              Sign Up
            </Link>
          </>
        )}
      </div>
    </>
  );

  return (
    <CardNav
      logo="/logo.png"
      logoAlt="Festora"
      logoText="Festora"
      items={items}
      headerActions={headerActions}
      baseColor="color-mix(in srgb, var(--bg) 76%, transparent)"
      menuColor="var(--fg)"
      buttonBgColor="var(--primary)"
      buttonTextColor="#fff"
    />
  );
}
