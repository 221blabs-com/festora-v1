'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const links = [
    { label: 'Events', href: '/events' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Contact', href: '/contact' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ];

  return (
    <footer className="hidden md:block relative border-t border-[var(--border-subtle)] bg-[var(--bg)] font-[family-name:var(--font-josefin)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          {/* Brand */}
          <Link href="/" className="group flex flex-row items-center gap-2 shrink-0">
            <Image src="/logo.png" alt="Festora Logo" width={24} height={24} className="h-6 w-auto object-contain" />
            <span className="text-xl font-[family-name:var(--font-marcellus)] font-bold text-[var(--primary)] uppercase tracking-widest group-hover:text-[var(--primary-light)] transition-colors duration-300">
              Festora
            </span>
          </Link>

          {/* Links */}
          <nav className="flex items-center gap-1 flex-wrap justify-center">
            {links.map((link, i) => (
              <span key={link.href} className="flex items-center">
                {i > 0 && (
                  <span className="text-[var(--border-subtle)] mx-1.5 sm:mx-2 text-[0.4rem] select-none">◆</span>
                )}
                <Link
                  href={link.href}
                  className="text-[var(--fg-muted)] hover:text-[var(--primary)] transition-colors duration-300 text-[0.65rem] sm:text-xs uppercase tracking-widest"
                >
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-[var(--fg-muted)] text-[0.6rem] sm:text-xs uppercase tracking-widest shrink-0">
            © {currentYear} Festora
          </p>
        </div>
      </div>
    </footer>
  );
}
