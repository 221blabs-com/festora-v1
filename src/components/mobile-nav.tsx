'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const handleThemeToggle = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    } else {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  };

  const isActiveProfile = pathname?.startsWith('/dashboard') || pathname === '/login';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full h-[76px] bg-[var(--bg-card)] border-t border-[var(--border-subtle)] flex justify-around items-center z-[100] px-2 pb-safe">
      <Link href="/" className={`flex flex-col items-center gap-1.5 p-2 transition-colors w-16 ${pathname === '/' ? 'text-[var(--primary)] relative' : 'text-[var(--fg-muted)] hover:text-[var(--gold)]'}`}>
        {pathname === '/' && <div className="absolute top-0 w-8 h-[2px] bg-[var(--primary)]"></div>}
        <Home className={`w-5 h-5 ${pathname === '/' ? 'mt-1' : ''}`} />
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase">Home</span>
      </Link>
      
      <Link href="/events" className={`flex flex-col items-center gap-1.5 p-2 transition-colors w-16 ${pathname?.startsWith('/events') ? 'text-[var(--primary)] relative' : 'text-[var(--fg-muted)] hover:text-[var(--gold)]'}`}>
        {pathname?.startsWith('/events') && <div className="absolute top-0 w-8 h-[2px] bg-[var(--primary)]"></div>}
        <Compass className={`w-5 h-5 ${pathname?.startsWith('/events') ? 'mt-1' : ''}`} />
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase">Events</span>
      </Link>



      <Link href={user ? "/dashboard" : "/login"} className={`flex flex-col items-center gap-1.5 p-2 transition-colors w-16 ${isActiveProfile ? 'text-[var(--primary)] relative' : 'text-[var(--fg-muted)] hover:text-[var(--gold)]'}`}>
        {isActiveProfile && <div className="absolute top-0 w-8 h-[2px] bg-[var(--primary)]"></div>}
        <div className={`w-6 h-6 rounded-full overflow-hidden flex items-center justify-center ${isActiveProfile ? 'mt-1 ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--bg-card)]' : 'border border-[var(--fg-muted)]'} ${!user?.photoURL && !isActiveProfile ? 'opacity-80' : ''}`}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <span className="font-[family-name:var(--font-marcellus)] text-xs font-bold text-[var(--fg)]">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'U'}
            </span>
          )}
        </div>
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase">{user ? "Profile" : "Login"}</span>
      </Link>
    </nav>
  );
}
