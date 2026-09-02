'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  Ticket, 
  User, 
  Search
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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

  return (
    <div className="min-h-screen bg-[var(--bg)] font-[family-name:var(--font-josefin)]">
      {/* Pattern Overlay */}
      <div className="fixed inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>

      {/* Ornament Lines */}
      <div className="fixed left-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>
      <div className="fixed right-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>

      <div className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Welcome Section */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="mb-16 text-center"
        >
           <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wider">
              Dashboard
           </h1>
           <div className="flex items-center justify-center gap-4 mb-6">
              <span className="h-[1px] w-12 bg-[var(--primary)]"></span>
              <span className="text-[var(--primary)] text-xs uppercase tracking-widest">Welcome, {user.email?.split('@')[0]}</span>
              <span className="h-[1px] w-12 bg-[var(--primary)]"></span>
           </div>
           <p className="text-[var(--fg-muted)] max-w-lg mx-auto">
              Manage your tickets, explore upcoming events, and update your profile settings.
           </p>
        </motion.div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           
           {/* My Tickets */}
           <Link href="/dashboard/tickets" className="group">
              <motion.div 
                className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] h-full flex flex-col items-center text-center p-8 transition-all duration-300 hover:border-[var(--gold)] hover:shadow-[0_0_20px_var(--gold-glow)]"
                whileHover={{ y: -5 }}
              >

                 

                 <div className="w-16 h-16 mb-6 rounded-full border border-[var(--gold)] flex items-center justify-center group-hover:bg-[var(--gold)]/10 transition-colors">
                    <Ticket className="w-8 h-8 text-[var(--gold)]" />
                 </div>
                 <h2 className="text-xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-3 uppercase tracking-wide group-hover:text-[var(--gold)] transition-colors">
                    My Tickets
                 </h2>
                 <p className="text-[var(--fg-muted)] text-sm leading-relaxed mb-6">
                    View purchased tickets and access your event passes.
                 </p>
                 <span className="mt-auto text-[var(--gold)] text-xs uppercase tracking-widest border-b border-[var(--gold)] pb-1">
                    View Tickets
                 </span>
              </motion.div>
           </Link>

           {/* Browse Events */}
           <Link href="/events" className="group">
              <motion.div 
                className="relative bg-[var(--bg-card)] border border-[var(--primary)] h-full flex flex-col items-center text-center p-8 transition-all duration-300 hover:shadow-[0_0_25px_var(--primary-glow)]"
                whileHover={{ y: -5 }}
              >



                 <div className="w-16 h-16 mb-6 rounded-full border border-[var(--primary)] flex items-center justify-center group-hover:bg-[var(--primary)]/10 transition-colors">
                    <Search className="w-8 h-8 text-[var(--primary)]" />
                 </div>
                 <h2 className="text-xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-3 uppercase tracking-wide group-hover:text-[var(--primary)] transition-colors">
                    Find Events
                 </h2>
                 <p className="text-[var(--fg-muted)] text-sm leading-relaxed mb-6">
                    Discover new and exciting campus events happening near you.
                 </p>
                 <span className="mt-auto text-[var(--primary)] text-xs uppercase tracking-widest border-b border-[var(--primary)] pb-1">
                    Browse Catalog
                 </span>
              </motion.div>
           </Link>

           {/* Profile */}
           <Link href="/dashboard/profile" className="group">
              <motion.div 
                className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] h-full flex flex-col items-center text-center p-8 transition-all duration-300 hover:border-[var(--gold)] hover:shadow-[0_0_20px_var(--gold-glow)]"
                whileHover={{ y: -5 }}
              >



                 <div className="w-16 h-16 mb-6 rounded-full border border-[var(--gold)] flex items-center justify-center group-hover:bg-[var(--gold)]/10 transition-colors">
                    <User className="w-8 h-8 text-[var(--gold)]" />
                 </div>
                 <h2 className="text-xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-3 uppercase tracking-wide group-hover:text-[var(--gold)] transition-colors">
                    My Profile
                 </h2>
                 <p className="text-[var(--fg-muted)] text-sm leading-relaxed mb-6">
                    Update your personal details and account preferences.
                 </p>
                 <span className="mt-auto text-[var(--gold)] text-xs uppercase tracking-widest border-b border-[var(--gold)] pb-1">
                    Manage Account
                 </span>
              </motion.div>
           </Link>

        </div>
      </div>
    </div>
  );
}
