'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    question: 'How much does Festora cost?',
    answer: 'It is free to create free events. For paid events, we charge a small percentage of the ticket price. Check our pricing page for details.',
  },
  {
    question: 'Can I customize my event page?',
    answer: 'Absolutely! You can upload your own branding, change colors, and add custom fields to your registration form.',
  },
  {
    question: 'How do I get paid?',
    answer: 'We integrate with Stripe and other payment processors. Funds are transferred directly to your connected bank account.',
  },
  {
    question: 'Is there a mobile app for organizers?',
    answer: 'Yes, we have a dedicated app for checking in attendees and monitoring real-time sales on the go.',
  },
  {
    question: 'Can I host virtual events?',
    answer: 'Yes, you can easily set up virtual or hybrid events and include links to your streaming platform.',
  },
];

const FAQSection = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="py-14 sm:py-20 md:py-24 bg-[var(--bg-card)] border-t border-[var(--border-subtle)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 font-[family-name:var(--font-marcellus)] text-[var(--fg)]">
            Frequently Asked Questions
          </h2>
          <p className="text-[var(--fg-muted)] text-sm sm:text-base">
            Everything you need to know about getting started.
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="border border-[var(--border-subtle)] rounded-sm bg-[var(--bg)] overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-[var(--bg-card-hover)] transition-colors gap-4"
              >
                <span className="text-sm sm:text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)]">
                  {faq.question}
                </span>
                <span className="flex-shrink-0 text-[var(--gold)]">
                  {activeIndex === index ? (
                    <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </span>
              </button>

              <AnimatePresence>
                {activeIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-t border-[var(--border-subtle)]"
                  >
                    <div className="p-4 sm:p-6 pt-0 mt-3 sm:mt-4 text-[var(--fg-muted)] leading-relaxed text-sm">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
