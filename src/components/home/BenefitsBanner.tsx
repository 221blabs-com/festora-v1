'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function BenefitsBanner() {
  return (
    <section className="py-24 bg-[var(--bg)] relative overflow-hidden border-y border-[var(--border-subtle)]">
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(212,175,55,0.08)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-[var(--gold)]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           whileInView={{ opacity: 1, scale: 1 }}
           viewport={{ once: true }}
           transition={{ duration: 0.8 }}
           className="corner-bracket p-12 border border-[var(--border-gold)] bg-[var(--bg-card)]/50 backdrop-blur-md relative"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-6 font-[family-name:var(--font-marcellus)] text-[var(--gold)] uppercase tracking-widest leading-tight">
            Elevate Your Events. <br />
            Focus on the <span className="text-[var(--primary)]">Experience</span>.
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent mx-auto mb-8" />
          <p className="text-lg md:text-xl text-[var(--fg-muted)] font-light max-w-2xl mx-auto leading-relaxed">
            Festora is built from the ground up for university networks. From seamless QR check-ins to instant ticketing, we provide the ultimate digital infrastructure so you can focus on throwing unforgettable events.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
