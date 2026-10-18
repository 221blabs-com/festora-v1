'use client';

import React from 'react';
import { motion } from 'framer-motion';

const organizations = [
  'National Service Scheme · MRUH',
  'Dept. of Cyber Security · MRUH',
  'Dept. of Physiotherapy · MRUH',
  'School of Allied Health Sciences',
];

const TestimonialsSection = () => {
  return (
    <section className="py-14 sm:py-20 bg-[var(--bg-card)] relative overflow-hidden border-y border-[var(--border-subtle)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-[var(--fg-muted)] text-xs uppercase tracking-[0.3em] mb-8"
        >
          Already running on Festora
        </motion.p>

        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {organizations.map((org, i) => (
            <motion.span
              key={org}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="font-[family-name:var(--font-marcellus)] text-sm sm:text-base text-[var(--fg)] tracking-wide"
            >
              {org}
            </motion.span>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-8 text-[var(--fg-muted)] text-sm max-w-xl mx-auto"
        >
          Started at Malla Reddy University, built for every department and student club that wants ticketing without the spreadsheet chaos.
        </motion.p>
      </div>
    </section>
  );
};

export default TestimonialsSection;
