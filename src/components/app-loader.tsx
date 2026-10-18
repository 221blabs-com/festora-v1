'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Full-screen branded preloader shown once when the app first mounts (not on
 * every client-side navigation - PageTransition/RouteProgress already cover
 * that). Lives at the root layout, so it naturally only remounts on a hard
 * reload / fresh tab, which is exactly when a "boot" moment reads as
 * intentional rather than annoying.
 */
export function AppLoader() {
  const [visible, setVisible] = useState(
    () => typeof window === 'undefined' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const start = performance.now();
    const minDuration = 900;

    const tick = (now: number) => {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / minDuration) * 100);
      setProgress(pct);
      if (elapsed < minDuration) {
        raf = requestAnimationFrame(tick);
      } else {
        setTimeout(() => setVisible(false), 180);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-[var(--bg)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
          aria-hidden="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.4 } }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-5"
          >
            <div className="relative w-16 h-16">
              <motion.div
                className="absolute inset-0 rounded-full border border-[var(--gold)]/30"
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="absolute inset-[6px] rounded-full border-t-2 border-[var(--primary)]"
                animate={{ rotate: -360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Image src="/logo.png" alt="Festora" width={28} height={28} className="h-7 w-auto object-contain" priority />
              </div>
            </div>

            <span className="font-[family-name:var(--font-marcellus)] text-lg uppercase tracking-[0.35em] text-[var(--fg)]">
              Festora
            </span>

            <div className="w-40 h-[2px] bg-[var(--border-subtle)] overflow-hidden rounded-full">
              <motion.div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--gold)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
