'use client';

import { useEffect, useRef, useState } from 'react';

const WORD = 'festora';

/**
 * Full-screen branded intro shown when the application loads.
 * Letters of "festora" rise in with a stagger, a gold rule sweeps beneath,
 * then the whole veil dissolves into the page. Respects prefers-reduced-motion,
 * locks scroll while visible, and can be skipped with a click or key press.
 */
export default function SplashScreen() {
  const [phase, setPhase] = useState<'intro' | 'exit' | 'gone'>('intro');
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Lock scrolling while the intro plays
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const introMs = reducedMotion.current ? 400 : 2200;
    const exitMs = reducedMotion.current ? 200 : 700;

    // QA hook: `?splash=hold` keeps the intro on screen until skipped (click/key)
    const hold = new URLSearchParams(window.location.search).get('splash') === 'hold';

    const exitTimer = hold ? undefined : window.setTimeout(() => setPhase('exit'), introMs);
    const goneTimer = hold ? undefined : window.setTimeout(() => setPhase('gone'), introMs + exitMs);

    const skip = () => {
      if (exitTimer !== undefined) clearTimeout(exitTimer);
      if (goneTimer !== undefined) clearTimeout(goneTimer);
      setPhase('exit');
      window.setTimeout(() => setPhase('gone'), exitMs);
    };

    window.addEventListener('pointerdown', skip, { once: true });
    window.addEventListener('keydown', skip, { once: true });

    return () => {
      if (exitTimer !== undefined) clearTimeout(exitTimer);
      if (goneTimer !== undefined) clearTimeout(goneTimer);
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Restore scrolling once fully gone
  useEffect(() => {
    if (phase === 'gone') document.body.style.overflow = '';
  }, [phase]);

  if (phase === 'gone') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[300] flex items-center justify-center bg-[#090909] ${
        phase === 'exit' ? 'splash-exit' : ''
      }`}
    >
      {/* Subtle vignette so the wordmark glows from the centre */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(200,16,46,0.14) 0%, rgba(9,9,9,0) 55%)',
        }}
      />

      {/* Art-deco corner brackets, echoing the modal frame style */}
      <span className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[var(--gold)]/70 splash-bracket" />
      <span className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[var(--gold)]/70 splash-bracket" />
      <span className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[var(--gold)]/70 splash-bracket" />
      <span className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[var(--gold)]/70 splash-bracket" />

      <div className="relative flex flex-col items-center px-4">
        {/* Wordmark */}
        <div className="flex items-baseline" aria-label="festora">
          {WORD.split('').map((letter, i) => (
            <span
              key={i}
              className="splash-letter text-[var(--fg)] font-[family-name:var(--font-marcellus)] text-[clamp(2.5rem,12vw,6rem)] leading-none"
              style={{ animationDelay: `${120 + i * 90}ms` }}
            >
              {letter}
            </span>
          ))}
        </div>

        {/* Sweeping gold rule */}
        <div className="mt-5 h-px w-[min(78vw,420px)] bg-[var(--border-subtle)] overflow-hidden">
          <div className="splash-rule h-full w-full bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
        </div>

        {/* Tagline */}
        <p
          className="splash-tagline mt-4 text-[var(--fg-muted)] text-xs sm:text-sm uppercase tracking-[0.45em] font-[family-name:var(--font-josefin)]"
          style={{ animationDelay: '900ms' }}
        >
          Events &amp; Ticketing
        </p>
      </div>
    </div>
  );
}
