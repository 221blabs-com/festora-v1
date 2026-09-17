'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Jordan',
    role: 'Event Director',
    quote: 'Festora simplified our entire ticketing process. The analytics are a game-changer for planning future events.',
  },
  {
    name: 'David Chen',
    role: 'Concert Promoter',
    quote: 'Design options are fantastic. Our event page looked professional and matched our brand perfectly.',
  },
  {
    name: 'Emily Davis',
    role: 'Workshop Host',
    quote: 'I love how easy it is to check people in with the app. No more paper lists!',
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-14 sm:py-20 md:py-24 bg-[var(--bg)] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10 sm:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-marcellus)] text-[var(--fg)]"
          >
            What Organizers Say
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            whileInView={{ opacity: 1, width: 80 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="h-0.5 sm:h-1 bg-[var(--gold)] mx-auto"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 sm:p-8 rounded-sm relative group hover:border-[var(--primary)] transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Quote icon - inline instead of absolute to prevent clipping */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[var(--bg)] border border-[var(--primary)] rounded-full flex items-center justify-center text-[var(--primary)] mb-4">
                <Quote className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
              </div>

              <div className="flex gap-0.5 mb-3 sm:mb-4 text-[var(--gold)]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 sm:w-4 sm:h-4 fill-current" />
                ))}
              </div>

              <p className="text-[var(--fg-muted)] italic mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">
                &quot;{testimonial.quote}&quot;
              </p>

              <div className="border-t border-[var(--border-subtle)] pt-3 sm:pt-4 mt-auto">
                <h4 className="font-bold text-sm sm:text-base text-[var(--fg)] group-hover:text-[var(--primary-light)] transition-colors">
                  {testimonial.name}
                </h4>
                <p className="text-[0.6rem] sm:text-xs uppercase tracking-wider text-[var(--gold)]">
                  {testimonial.role}
                </p>
              </div>

              {/* Corner Accents */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[var(--gold)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
