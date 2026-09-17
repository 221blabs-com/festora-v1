'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Ticket, Scan, LineChart } from 'lucide-react';

const steps = [
  {
    icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: 'Create Your Event',
    description: 'Use our intuitive dashboard to set up your event in minutes. Add descriptions, images, and schedules.',
  },
  {
    icon: <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: 'Sell Tickets',
    description: 'Launch your branded ticket page. Accept secure payments instantly and track sales in real-time.',
  },
  {
    icon: <Scan className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: 'Check In Attendees',
    description: 'Download our organizer app to scan QR codes at the door. Keep lines moving fast and secure.',
  },
  {
    icon: <LineChart className="w-5 h-5 sm:w-6 sm:h-6" />,
    title: 'Detailed Analytics',
    description: 'Post-event reports give you insights into attendance, demographics, and revenue growth.',
  },
];

const HowItWorksSection = () => {
  return (
    <section className="py-14 sm:py-20 md:py-24 bg-[var(--bg-card)] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-40 sm:w-64 h-40 sm:h-64 bg-[var(--gold)]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-40 sm:w-64 h-40 sm:h-64 bg-[var(--primary)]/5 rounded-full blur-3xl" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10 sm:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-marcellus)] text-[var(--fg)]"
          >
            How It Works
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            whileInView={{ opacity: 1, width: 60 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="h-0.5 sm:h-1 bg-[var(--primary)] mx-auto mb-3 sm:mb-4"
          />
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-[var(--fg-muted)] max-w-2xl mx-auto text-sm sm:text-lg font-light px-2"
          >
            A simple, streamlined process designed for organizers like you.
          </motion.p>
        </div>

        {/* Desktop: horizontal with connecting line */}
        <div className="relative">
          <div className="hidden md:block absolute top-[2.25rem] left-0 w-full h-[1px] bg-[var(--border-subtle)] z-0" />

          {/* Mobile: vertical timeline · Desktop: 4-col grid */}
          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-0 md:gap-8">
            {/* Mobile vertical connector */}
            <div className="md:hidden absolute left-[1.75rem] top-0 bottom-0 w-[1px] bg-gradient-to-b from-[var(--gold)]/60 via-[var(--gold)]/30 to-transparent z-0" />

            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative z-10 flex md:flex-col items-start md:items-center text-left md:text-center group py-4 md:py-0"
              >
                {/* Step circle */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-full bg-[var(--bg)] border-2 border-[var(--gold)] flex items-center justify-center shadow-lg shadow-[var(--gold)]/20 group-hover:bg-[var(--primary)] group-hover:border-[var(--primary-light)] transition-all duration-300 md:mb-6">
                  <div className="text-[var(--gold)] group-hover:text-white transition-colors">
                    {step.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="ml-5 md:ml-0 flex-1 min-w-0">
                  <h3 className="text-base sm:text-xl font-bold mb-1 sm:mb-3 font-[family-name:var(--font-marcellus)] text-[var(--fg)] group-hover:text-[var(--primary-light)] transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-[var(--fg-muted)] text-xs sm:text-sm leading-relaxed md:px-4">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
