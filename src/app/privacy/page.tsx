'use client';

import { motion } from 'framer-motion';
import { Shield, Eye, Lock, UserCheck, Mail, MapPin } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)]">
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed"></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-6 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
            Privacy{' '}
            <span className="text-[var(--primary)]">
              Policy
            </span>
          </h1>
          <p className="text-xl text-[var(--fg-muted)] max-w-3xl mx-auto">
            Your privacy matters to us. Learn how we collect, use, and protect your personal information.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-4xl mx-auto space-y-8"
        >

          {/* Privacy Highlights */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[var(--bg-card)] border border-[var(--primary)]/30 rounded-lg p-6 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[var(--primary)]/5 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
              <Shield className="w-8 h-8 text-[var(--primary)] mx-auto mb-3 relative z-10" />
              <h3 className="font-semibold text-[var(--fg)] font-[family-name:var(--font-marcellus)] relative z-10">Data Protection</h3>
              <p className="text-xs text-[var(--fg-muted)] mt-2 relative z-10">Your data is encrypted and secured</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--gold)]/30 rounded-lg p-6 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[var(--gold)]/5 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
              <Eye className="w-8 h-8 text-[var(--gold)] mx-auto mb-3 relative z-10" />
              <h3 className="font-semibold text-[var(--fg)] font-[family-name:var(--font-marcellus)] relative z-10">Transparency</h3>
              <p className="text-xs text-[var(--fg-muted)] mt-2 relative z-10">Clear about what we collect</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--primary)]/30 rounded-lg p-6 text-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-[var(--primary)]/5 transform scale-y-0 group-hover:scale-y-100 transition-transform origin-bottom duration-300"></div>
              <UserCheck className="w-8 h-8 text-[var(--primary)] mx-auto mb-3 relative z-10" />
              <h3 className="font-semibold text-[var(--fg)] font-[family-name:var(--font-marcellus)] relative z-10">Your Control</h3>
              <p className="text-xs text-[var(--fg-muted)] mt-2 relative z-10">You own and control your data</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 md:p-12 relative space-y-12">
             
             

            <section>
              <h2 className="text-2xl font-bold mb-6 text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 inline-block">1. Information We Collect</h2>
              <p className="text-[var(--fg-muted)] leading-relaxed mb-6 text-lg">
                We collect information that you provide directly to us, including:
              </p>
              <ul className="grid md:grid-cols-2 gap-4 text-[var(--fg-muted)]">
                <li className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors">
                  <UserCheck className="w-4 h-4 text-[var(--primary)]" />
                  <span>Account information (Name, Email)</span>
                </li>
                <li className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors">
                   <Shield className="w-4 h-4 text-[var(--primary)]" />
                  <span>Transaction data (processed securely)</span>
                </li>
                <li className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors">
                   <Mail className="w-4 h-4 text-[var(--primary)]" />
                  <span>Communications with us</span>
                </li>
                <li className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] hover:border-[var(--primary)] transition-colors">
                   <MapPin className="w-4 h-4 text-[var(--primary)]" />
                  <span>Event participation history</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 inline-block">2. How We Use Your Data</h2>
              <div className="space-y-4 text-[var(--fg-muted)] leading-relaxed">
                <p>We use the information we collect to:</p>
                <ul className="space-y-2 ml-4 border-l-2 border-[var(--primary)] pl-6 py-2">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Provide, maintain, and improve our services</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Process your transactions and send related information</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Send you technical notices and support messages</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></span> Communicate with you about products, services, and events</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-6 text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide border-b border-[var(--border-subtle)] pb-4 inline-block">3. Data Security</h2>
              <p className="text-[var(--fg-muted)] leading-relaxed">
                We implement appropriate technical and organizational measures to protect the security of your personal information.
                However, please note that no system is completely secure, and we cannot guarantee the security of information transmitted through the internet.
              </p>
            </section>

            <section className="pt-8 border-t border-[var(--border-subtle)]">
              <h2 className="text-2xl font-bold mb-6 text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide">Contact Us</h2>
              <p className="text-[var(--fg-muted)] mb-4">
                If you have any questions about this Privacy Policy, please contact us:
              </p>
              <a href="mailto:privacy@festora.com" className="inline-flex items-center gap-2 text-[var(--primary)] font-bold uppercase tracking-widest hover:text-[var(--primary-light)] transition-colors">
                <Mail className="w-4 h-4" />
                privacy@festora.com
              </a>
            </section>

          </div>
          
           <div className="text-center text-xs text-[var(--fg-muted)] mt-12 uppercase tracking-widest opacity-50">
            Last updated: March 2026
          </div>
        </motion.div>
      </div>
    </div>
  );
}
