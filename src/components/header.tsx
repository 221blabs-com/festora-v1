'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X, User, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import ThemeToggle from '@/components/theme-toggle';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  
  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Discover Events', href: '/events' },
    { name: 'Organizer', href: '/organizer' },
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="hidden md:block fixed top-0 w-full z-50 bg-[var(--bg)]/80 backdrop-blur-md border-b-2 border-[var(--border-subtle)] transition-colors duration-300">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="group relative flex items-center gap-3">
            <Image src="/logo.png" alt="Festora Logo" width={36} height={36} className="h-9 w-auto object-contain" priority />
            <div className="relative">
              <span className="text-2xl font-[family-name:var(--font-marcellus)] font-bold text-[var(--primary)] uppercase tracking-widest group-hover:text-[var(--primary-light)] transition-colors">
                Festora
              </span>
              <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-[var(--primary)] group-hover:w-full transition-all duration-300"></span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item, index) => (
              <div key={item.name} className="flex items-center">
                 {index > 0 && <span className="text-[var(--primary)] mr-8 text-[0.5rem]">◆</span>}
                 <Link
                  href={item.href}
                  className="text-[var(--fg-muted)] hover:text-[var(--primary)] transition-colors font-[family-name:var(--font-josefin)] text-sm uppercase tracking-widest font-semibold"
                >
                  {item.name}
                </Link>
              </div>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <ThemeToggle />
            
            {/* Auth Section */}
            {loading ? (
              <div className="flex items-center space-x-3 animate-pulse">
                <div className="w-14 h-8 bg-[var(--border-subtle)]/50 rounded" />
                <div className="w-20 h-8 bg-[var(--primary)]/20 rounded" />
              </div>
            ) : user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 text-[var(--fg)] hover:text-[var(--primary)] transition-colors outline-none group"
                >
                  <div className={`w-9 h-9 rounded-full border border-[var(--primary)] flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:shadow-[0_0_15px_var(--primary-glow)] ${!user.photoURL ? 'group-hover:bg-[var(--primary)]/10' : ''}`}>
                    {user.photoURL ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={user.photoURL} alt={user.email || 'User'} className="w-full h-full object-cover" />
                      </>
                    ) : (
                      <span className="text-[var(--primary)] text-sm font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-4 w-56 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] shadow-[0_4px_25px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                      <div className="px-4 py-3 text-xs uppercase tracking-wider text-[var(--fg-muted)] border-b border-[var(--border-subtle)] truncate" title={user.email || ''}>
                        {user.email}
                      </div>
                      <Link
                        href="/dashboard"
                        className="block px-4 py-3 text-sm text-[var(--fg)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--primary)] transition-colors uppercase tracking-wide font-[family-name:var(--font-josefin)]"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <User className="w-4 h-4 inline mr-2" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-3 text-sm text-[var(--fg)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--primary)] transition-colors uppercase tracking-wide font-[family-name:var(--font-josefin)]"
                      >
                        <LogOut className="w-4 h-4 inline mr-2" />
                        Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-[var(--fg)] hover:text-[var(--primary)] transition-colors font-[family-name:var(--font-josefin)] text-sm uppercase tracking-widest font-semibold"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="btn-primary px-6 h-10 text-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <ThemeToggle />
            <button
              className="text-[var(--fg)] hover:text-[var(--primary)] transition-colors p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-[var(--bg)] border-b border-[var(--border)] overflow-hidden"
          >
            <div className="px-4 py-6 space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="block text-[var(--fg)] hover:text-[var(--primary)] text-center transition-colors font-[family-name:var(--font-josefin)] uppercase tracking-widest text-lg py-2 border-b border-[var(--border-subtle)]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {loading ? (
                <div className="pt-4 flex justify-center">
                  <div className="w-32 h-10 bg-[var(--border-subtle)]/40 rounded animate-pulse" />
                </div>
              ) : user ? (
                 <>
                  <Link
                    href="/dashboard"
                    className="block text-[var(--fg)] hover:text-[var(--primary)] text-center transition-colors font-[family-name:var(--font-josefin)] uppercase tracking-widest text-lg py-2 border-b border-[var(--border-subtle)]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                    className="block w-full text-[var(--fg)] hover:text-[var(--primary)] text-center transition-colors font-[family-name:var(--font-josefin)] uppercase tracking-widest text-lg py-2"
                  >
                    Sign Out
                  </button>
                 </>
              ) : (
                <div className="flex flex-col space-y-4 pt-4">
                  <Link
                    href="/login"
                    className="block text-[var(--fg)] hover:text-[var(--primary)] text-center transition-colors font-[family-name:var(--font-josefin)] uppercase tracking-widest text-lg"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-primary w-full text-center py-3"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}