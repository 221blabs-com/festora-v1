'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

const CTASection = () => {
  return (
    <section className="py-16 sm:py-24 md:py-32 relative overflow-hidden flex items-center justify-center bg-[var(--bg)]">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/10 via-[var(--bg-card)] to-[var(--gold)]/10 opacity-70" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-[var(--primary)]/5 rounded-full blur-[80px] sm:blur-[100px] animate-pulse" />

      <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="border border-[var(--gold)]/30 bg-[var(--bg-card)]/80 backdrop-blur-md p-6 sm:p-10 md:p-16 rounded-2xl shadow-2xl relative corner-bracket"
        >

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-4 sm:mb-6"
          >
            <div className="bg-[var(--primary)]/10 p-3 sm:p-4 rounded-full border border-[var(--primary)]/20 animate-bounce">
              <Sparkles className="w-5 h-5 sm:w-8 sm:h-8 text-[var(--gold)]" />
            </div>
          </motion.div>

          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-6 font-[family-name:var(--font-marcellus)] text-[var(--fg)]">
            Ready to Transform Your Event Experience?
          </h2>

          <p className="text-[var(--fg-muted)] text-sm sm:text-lg mb-6 sm:mb-10 max-w-2xl mx-auto">
            Join thousands of organizers who trust Festora for seamless ticketing, stunning designs, and powerful insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <Link
              href="/organizer/apply"
              className="group relative w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-[var(--primary)] text-white text-sm sm:text-lg font-bold rounded-sm overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(200,16,46,0.4)] text-center"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                Get Started Free <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary-light)] to-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            <Link
              href="/pricing"
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-transparent border border-[var(--fg-muted)] text-[var(--fg)] text-sm sm:text-lg font-medium rounded-sm hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors text-center"
            >
              View Pricing
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
