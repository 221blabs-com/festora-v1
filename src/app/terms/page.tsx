'use client';

import { motion } from 'framer-motion';

export default function TermsPage() {
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
                 Terms &{' '}
                 <span className="text-[var(--primary)]">
                    Conditions
                 </span>
              </h1>
           </div>
           <p className="text-xl text-[var(--fg-muted)] max-w-3xl mx-auto mt-6">
              Please read these terms and conditions carefully before using our service.
           </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 md:p-12 relative space-y-12"
        >
           
           

            <section>
              <h2 className="text-2xl font-bold mb-6 text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 inline-block">1. Acceptance of Terms</h2>
              <p className="text-[var(--fg-muted)] leading-relaxed text-lg">
                By accessing and using Festora, you accept and agree to be bound by the terms and provision of this agreement.
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 inline-block">2. Use License</h2>
              <p className="text-[var(--fg-muted)] leading-relaxed mb-6">
                Permission is granted to temporarily download one copy of Festora&apos;s materials for personal,
                non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="text-[var(--fg-muted)] space-y-3 ml-4 border-l-2 border-[var(--primary)] pl-6 py-2">
                 <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Modify or copy the materials</li>
                 <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Use the materials for any commercial purpose</li>
                 <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Attempt to decompile or reverse engineer any software</li>
                 <li className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Remove any copyright or other proprietary notations</li>
              </ul>
            </section>
            
            <section>
               <h2 className="text-2xl font-bold mb-6 text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 inline-block">3. Limitation of Liability</h2>
               <p className="text-[var(--fg-muted)] leading-relaxed">
                  In no event shall Festora or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Festora&apos;s website.
               </p>
            </section>
            
            <section>
               <h2 className="text-2xl font-bold mb-6 text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 inline-block">4. Revisions</h2>
               <p className="text-[var(--fg-muted)] leading-relaxed">
                  The materials appearing on Festora&apos;s website could include technical, typographical, or photographic errors. Festora does not warrant that any of the materials on its website are accurate, complete, or current.
               </p>
            </section>

        </motion.div>
         
         <div className="text-center text-xs text-[var(--fg-muted)] mt-12 uppercase tracking-widest opacity-50">
            Last updated: March 2026
         </div>
      </div>
    </div>
  );
}
