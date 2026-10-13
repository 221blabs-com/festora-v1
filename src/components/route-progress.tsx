'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Remounted (via `key`) on every pathname change, so "show on navigation" is
 * driven by React's own mount lifecycle instead of comparing a ref against
 * the previous pathname during render.
 */
function ProgressFlash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[200] h-[2.5px] origin-left pointer-events-none"
      style={{
        background: 'linear-gradient(90deg, var(--primary), var(--gold), var(--primary-light))',
        boxShadow: '0 0 12px var(--primary-glow), 0 0 4px var(--gold-glow)',
      }}
      initial={{ scaleX: 0, opacity: 1 }}
      animate={{ scaleX: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

/**
 * A slim top-of-viewport progress bar that sweeps in on every route change,
 * giving every navigation in the app the same "something is happening"
 * feedback a full page load would, without one. Deliberately avoids
 * useSearchParams() here - that requires a Suspense boundary, and this
 * component is mounted unconditionally at the root layout.
 */
export function RouteProgress() {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <ProgressFlash key={pathname} />
    </AnimatePresence>
  );
}
