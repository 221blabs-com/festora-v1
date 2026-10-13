'use client';

import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

/**
 * Wraps every route's content in a consistent enter animation keyed by
 * pathname, so every navigation across the app gets the same polished
 * transition without any individual page having to implement it.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
