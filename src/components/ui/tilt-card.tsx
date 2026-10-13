'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Max tilt angle in degrees. */
  maxTilt?: number;
  /** How much the card lifts toward the viewer on hover, in px. */
  lift?: number;
  glare?: boolean;
}

/**
 * Gives any card real 3D depth: it tilts toward the cursor in a CSS
 * perspective and lifts slightly, with a soft light-glare sweep. Pure
 * CSS transforms (cheap, no WebGL) - meant to be dropped around any
 * existing card so every grid of cards in the app shares the same feel.
 */
export function TiltCard({ children, className = '', maxTilt = 10, lift = 14, glare = true }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const rotateXRaw = useMotionValue(0);
  const rotateYRaw = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(50);

  const rotateX = useSpring(rotateXRaw, { stiffness: 220, damping: 20, mass: 0.6 });
  const rotateY = useSpring(rotateYRaw, { stiffness: 220, damping: 20, mass: 0.6 });
  const z = useSpring(useMotionValue(0), { stiffness: 220, damping: 22 });

  const glareOpacity = useTransform(z, [0, lift], [0, 0.18]);
  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, var(--gold-light) 0%, transparent 60%)`
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;

    rotateYRaw.set((px - 0.5) * maxTilt * 2);
    rotateXRaw.set(-(py - 0.5) * maxTilt * 2);
    z.set(lift);
    glareX.set(px * 100);
    glareY.set(py * 100);
  };

  const handleMouseLeave = () => {
    rotateXRaw.set(0);
    rotateYRaw.set(0);
    z.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: 1000 }}
      className={className}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          translateZ: z,
          transformStyle: 'preserve-3d',
        }}
        className="relative h-full"
      >
        {children}
        {glare && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
            style={{
              opacity: glareOpacity,
              background: glareBackground,
            }}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
