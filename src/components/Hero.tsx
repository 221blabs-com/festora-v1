'use client';

import React from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import LiquidEther from '@/components/liquid-ether';
import HeroScene3D from '@/components/hero-scene-3d';
import { TiltCard } from '@/components/ui/tilt-card';

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero() {
  return (
    <section className="hero relative select-none">
      {/* Layer 1: ambient liquid shader, recolored to the Art Deco palette */}
      <div className="absolute inset-0 z-0 opacity-50 mix-blend-screen">
        <LiquidEther
          colors={['#C8102E', '#C9A84C', '#E6C96A']}
          mouseForce={14}
          cursorSize={110}
          resolution={0.5}
          autoDemo
          autoSpeed={0.35}
          autoIntensity={1.6}
        />
      </div>

      {/* Layer 2: floating faceted 3D gems */}
      <HeroScene3D className="absolute inset-0 z-[1] pointer-events-none" />

      {/* Vertical side ornament lines */}
      <div className="hero-side-line-left z-10" aria-hidden="true" />
      <div className="hero-side-line-right z-10" aria-hidden="true" />

      <motion.div
        className="max-w-4xl mx-auto text-center relative z-10 w-full px-4"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Eyebrow label */}
        <motion.p className="hero-eyebrow" variants={itemVariants}>
          ◆ &nbsp; The Premier Ticketing Platform &nbsp; ◆
        </motion.p>

        {/* Main headline */}
        <motion.h1 className="hero-headline" variants={itemVariants}>
          Every Great <span className="accent">Event</span><br />
          Starts Here
        </motion.h1>

        {/* Subheadline */}
        <motion.p className="hero-sub" variants={itemVariants}>
          Discover extraordinary events. Secure your seat.
          Experience the unforgettable.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          className="flex items-center justify-center gap-4 flex-wrap mt-2"
          variants={itemVariants}
        >
          <TiltCard maxTilt={6} lift={6} glare={false} className="rounded-xl">
            <Link href="/events">
              <button className="btn-primary">
                Browse Events
              </button>
            </Link>
          </TiltCard>
          <TiltCard maxTilt={6} lift={6} glare={false} className="rounded-xl">
            <Link href="/organizer/apply">
              <button className="btn-ghost">
                Sell Tickets
              </button>
            </Link>
          </TiltCard>
        </motion.div>

      </motion.div>
    </section>
  )
}
