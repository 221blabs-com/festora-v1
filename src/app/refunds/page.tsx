'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Clock, CheckCircle, XCircle, Mail } from 'lucide-react';

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed"></div>
      
      {/* Ornament Lines */}
      <div className="fixed left-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>
      <div className="fixed right-6 top-0 bottom-0 w-[1px] bg-[var(--border-subtle)] hidden lg:block pointer-events-none z-0"></div>

      <div className="container mx-auto px-4 py-16 relative z-10 max-w-5xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-block relative mb-4">
             <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[var(--gold)]"></div>
             <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[var(--gold)]"></div>
             <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[var(--gold)]"></div>
             <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[var(--gold)]"></div>
             <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-marcellus)] uppercase tracking-wide px-8 py-4">
               Refunds &{' '}
               <span className="text-[var(--primary)]">
                 Cancellations
               </span>
             </h1>
          </div>
          <p className="text-xl text-[var(--fg-muted)] max-w-3xl mx-auto mt-6">
            Understanding our refund and cancellation policies for events on Festora.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-12"
        >

          {/* Quick Summary */}
          <div className="bg-[var(--bg-card)] border border-[var(--gold)] p-8 relative">
            
            
            
            <div className="flex items-center gap-4 mb-4">
              <AlertCircle className="w-8 h-8 text-[var(--gold)]" />
              <h2 className="text-2xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">Quick Summary</h2>
            </div>
            <p className="text-[var(--fg-muted)] text-lg leading-relaxed">
              Refund policies vary by event and are set by individual event organizers.
              Always check the specific event&apos;s refund policy before purchasing tickets.
            </p>
          </div>

          <div className="space-y-12">

            {/* General Policy */}
            <section className="relative pl-8 border-l-2 border-[var(--primary)]">
              <h2 className="text-2xl font-bold mb-4 font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">General Refund Policy</h2>
              <p className="text-[var(--fg-muted)] leading-relaxed text-lg">
                Festora serves as a platform connecting event organizers with attendees. Refund policies are
                determined by individual event organizers and may vary from event to event. We encourage all
                users to carefully review the specific refund policy for each event before making a purchase.
              </p>
            </section>

            {/* Event Organizer Cancellations */}
            <section>
              <h2 className="text-2xl font-bold mb-6 font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide flex items-center gap-3">
                 <span className="w-12 h-[1px] bg-[var(--primary)]"></span>
                 Event Organizer Cancellations
              </h2>
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-8 relative">
                <div className="absolute top-0 left-0 w-2 h-2 bg-[var(--primary)]"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 bg-[var(--primary)]"></div>
                
                <div className="flex items-center gap-3 mb-4">
                  <XCircle className="w-6 h-6 text-[var(--primary)]" />
                  <h3 className="font-semibold text-[var(--primary)] uppercase tracking-wide">If an event is cancelled by the organizer:</h3>
                </div>
                <ul className="text-[var(--fg-muted)] space-y-3 ml-2">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Full refunds will be processed automatically</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Refunds typically take 5-7 business days to appear in your account</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> You will be notified via email about the cancellation and refund</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> No cancellation fees will be charged to attendees</li>
                </ul>
              </div>
            </section>

            {/* Attendee Cancellations */}
            <section>
              <h2 className="text-2xl font-bold mb-6 font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide flex items-center gap-3">
                 <span className="w-12 h-[1px] bg-[var(--primary)]"></span>
                 Attendee Cancellations
              </h2>
              <p className="text-[var(--fg-muted)] leading-relaxed mb-6 text-lg">
                If you need to cancel your ticket purchase, the refund policy depends on the specific event&apos;s terms:
              </p>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 relative group hover:border-[var(--gold)] transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <h3 className="font-bold text-[var(--fg)] uppercase tracking-widest text-sm">Flexible Events</h3>
                  </div>
                  <ul className="text-[var(--fg-muted)] space-y-2 text-sm">
                    <li>• Full refund up to 7 days before event</li>
                    <li>• 50% refund up to 3 days before</li>
                    <li>• No refund within 48 hours</li>
                  </ul>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 relative group hover:border-[var(--gold)] transition-colors">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock className="w-6 h-6 text-[var(--gold)]" />
                    <h3 className="font-bold text-[var(--fg)] uppercase tracking-widest text-sm">Standard Events</h3>
                  </div>
                  <ul className="text-[var(--fg-muted)] space-y-2 text-sm">
                    <li>• Full refund up to 14 days before</li>
                    <li>• 75% refund up to 7 days before</li>
                    <li>• No refund within 7 days</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Free Events */}
            <section>
               <h2 className="text-2xl font-bold mb-6 font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide flex items-center gap-3">
                 <span className="w-12 h-[1px] bg-[var(--primary)]"></span>
                 Free Events
              </h2>
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 relative">
                 <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gold)]"></div>
                <p className="text-[var(--fg-muted)]">
                  For free events, you can cancel your registration at any time before the event.
                  Simply log into your dashboard and cancel your registration. This helps organizers
                  manage capacity and allows others to register.
                </p>
              </div>
            </section>

            {/* How to Request a Refund */}
            <section>
              <h2 className="text-2xl font-bold mb-8 font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide text-center">How to Request a Refund</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center relative group hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-10 h-10 border border-[var(--primary)] bg-[var(--bg)] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[var(--primary)] transition-colors">
                     <span className="text-[var(--primary)] font-bold text-lg  group-hover:text-[var(--fg)]">1</span>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-[var(--fg)] uppercase tracking-wide text-sm">Check Event Policy</h3>
                    <p className="text-[var(--fg-muted)] text-sm">Review the specific refund policy for your event in your ticket confirmation or event page.</p>
                  </div>
                </div>

                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center relative group hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-10 h-10 border border-[var(--primary)] bg-[var(--bg)] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[var(--primary)] transition-colors">
                     <span className="text-[var(--primary)] font-bold text-lg  group-hover:text-[var(--fg)]">2</span>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-[var(--fg)] uppercase tracking-wide text-sm">Contact Support</h3>
                    <p className="text-[var(--fg-muted)] text-sm">Email us at festora@gmail.com with your order details and reason for refund request.</p>
                  </div>
                </div>

                <div className="p-6 bg-[var(--bg-card)] border border-[var(--border-subtle)] text-center relative group hover:-translate-y-1 transition-transform duration-300">
                   <div className="w-10 h-10 border border-[var(--primary)] bg-[var(--bg)] rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-[var(--primary)] transition-colors">
                     <span className="text-[var(--primary)] font-bold text-lg  group-hover:text-[var(--fg)]">3</span>
                  </div>
                  <div>
                    <h3 className="font-bold mb-2 text-[var(--fg)] uppercase tracking-wide text-sm">Processing Time</h3>
                    <p className="text-[var(--fg-muted)] text-sm">Refunds are typically processed within 5-7 business days after approval.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Special Circumstances */}
            <section className="bg-[var(--bg-card)] p-8 border-t border-b border-[var(--border-subtle)] text-center my-12">
              <h2 className="text-2xl font-bold mb-4 font-[family-name:var(--font-marcellus)] text-[var(--gold)] uppercase tracking-wide">Special Circumstances</h2>
              <p className="text-[var(--fg-muted)] leading-relaxed mb-6 max-w-2xl mx-auto">
                We understand that sometimes unexpected situations arise. We may consider refunds outside
                the standard policy for medical emergencies, travel restrictions, or technical issues.
              </p>
            </section>

            {/* Contact Section */}
            <section className="text-center pt-8 border-t border-[var(--border-subtle)]">
              <h2 className="text-2xl font-bold mb-6 font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">Need Help?</h2>
              <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 inline-block max-w-lg w-full relative">
                 
                 
                <p className="text-[var(--fg)] mb-6 font-bold uppercase tracking-widest text-sm">
                  Have questions about refunds or need to request a cancellation?
                </p>
                <div className="space-y-4 text-sm text-[var(--fg-muted)]">
                  <div className="flex items-center justify-center gap-3">
                    <Mail className="w-5 h-5 text-[var(--primary)]" />
                    <span>Email: festora@gmail.com</span>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Clock className="w-5 h-5 text-[var(--primary)]" />
                    <span>Response Time: Within 24 hours</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--fg-muted)] mt-8 uppercase tracking-widest opacity-50">
                Last updated: December 2024
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
