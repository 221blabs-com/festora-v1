'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Mail,
  Phone,
  User,
  Users,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Clock,
  Briefcase,
  Layers,
  Send,
  AlertCircle
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function ContactEnterprisePage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    role: 'Student Fest Convener',
    attendees: '3,000 - 5,000',
    eventType: 'College Cultural Fest',
    timeline: '1 - 3 months',
    message: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null);

  const roles = [
    'Student Fest Convener',
    'Faculty Coordinator / Dean',
    'Head of Student Affairs',
    'Technical Club Lead',
    'Corporate Event Organizer',
    'Other Executive'
  ];

  const attendeeScales = [
    '1,000 - 3,000',
    '3,000 - 5,000',
    '5,000 - 10,000',
    '10,000+ Unlimited'
  ];

  const eventTypes = [
    'College Cultural Fest',
    'Technical Symposium',
    'Conference / Summit',
    'Hackathon / Esports',
    'Sports Tournament',
    'Multi-Campus Festival'
  ];

  const timelines = [
    'Within 30 Days',
    '1 - 3 Months',
    '3 - 6 Months',
    'Planning Ahead'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!formData.name.trim()) {
      setError('Please provide your full name.');
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please provide a valid official email address.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please provide a contact phone or WhatsApp number.');
      return;
    }
    if (!formData.organization.trim()) {
      setError('Please enter the name of your College, University, or Organization.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit enterprise request. Please try again.');
      }

      setSubmittedInquiryId(data.inquiryId || 'ENT-CONFIRMED');
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err?.message || 'An unexpected error occurred. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090909] text-[#e8e8e8] font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Subtle Pattern & Ambient Glow */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#d31438]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-[#ffd400]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 right-1/4 w-96 h-96 bg-[#6d1120]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Decorative Side Borders */}
      <div className="fixed left-0 top-0 bottom-0 w-24 border-r border-[#3f1119]/50 hidden lg:block pointer-events-none opacity-40" />
      <div className="fixed right-0 top-0 bottom-0 w-24 border-l border-[#3f1119]/50 hidden lg:block pointer-events-none opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 relative z-10">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#ffd400]/90 hover:text-[#ffd400] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#d31438]" />
            <span>Back to Pricing</span>
          </Link>
        </div>

        {/* Hero Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          {/* Badge in Crimson Red & Yellow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#3f1119] bg-[#121212] mb-6">
            <span className="w-2 h-2 bg-[#ffd400] rounded-full animate-pulse" />
            <span className="text-[#ffd400] text-xs font-bold uppercase tracking-widest">
              Festora Enterprise &bull; Let&apos;s Talk
            </span>
            <span className="w-2 h-2 bg-[#ffd400] rounded-full animate-pulse" />
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-[family-name:var(--font-marcellus)] uppercase tracking-wide mb-6 text-[#e8e8e8]">
            Scale Your Events With{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d31438] via-[#ffd400] to-amber-300">
              Festora Enterprise
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[#9a9a9a] leading-relaxed font-[family-name:var(--font-josefin)]">
            Whether you&apos;re orchestrating a flagship college festival with 10,000+ attendees or coordinating
            multi-campus university events, our enterprise team delivers custom ticketing, high-speed scanners, and dedicated SLAs.
          </p>
        </motion.div>

        {/* Content Grid: Features vs Form */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* Left Column: Enterprise Value Proposition & Contact Details */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-5 space-y-6"
          >
            {/* Value Highlights with Yellow Corner Accents */}
            <div className="bg-[#121212] border border-[#3f1119] p-6 sm:p-8 relative before:content-[''] before:absolute before:-top-px before:-left-px before:w-4 before:h-4 before:border-t before:border-l before:border-[#ffd400] after:content-[''] after:absolute after:-bottom-px after:-right-px after:w-4 after:h-4 after:border-b after:border-r after:border-[#ffd400]">
              <h3 className="section-title yellow mb-6">
                <Sparkles className="w-5 h-5 text-[#d31438]" />
                Enterprise Privileges
              </h3>

              <div className="space-y-5">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#090909] border border-[#3f1119] rounded-none text-[#ffd400] shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-[#e8e8e8]">
                      Unlimited Scale &amp; Concurrency
                    </h4>
                    <p className="text-xs text-[#9a9a9a] mt-1 leading-relaxed">
                      Engineered for viral ticket drops, zero queuing slowdowns, and handling millions of page visits seamlessly.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#090909] border border-[#3f1119] rounded-none text-[#ffd400] shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-[#e8e8e8]">
                      Multi-Campus &amp; Tiered Access
                    </h4>
                    <p className="text-xs text-[#9a9a9a] mt-1 leading-relaxed">
                      Unified dashboard for university networks, separate department privileges, and automated team roles.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#090909] border border-[#3f1119] rounded-none text-[#ffd400] shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-[#e8e8e8]">
                      High-Speed Scanners &amp; Turnstiles
                    </h4>
                    <p className="text-xs text-[#9a9a9a] mt-1 leading-relaxed">
                      Hardware scanner support, offline badge verification, and synchronized turnstile integrations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#090909] border border-[#3f1119] rounded-none text-[#ffd400] shrink-0 mt-0.5">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-[#e8e8e8]">
                      Dedicated Account Lead &amp; 24/7 SLA
                    </h4>
                    <p className="text-xs text-[#9a9a9a] mt-1 leading-relaxed">
                      Direct phone access to senior engineers and on-ground technical support for critical fest days.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Connect Box */}
            <div className="bg-[#121212] border border-[#3f1119] p-6 relative before:content-[''] before:absolute before:-top-px before:-left-px before:w-4 before:h-4 before:border-t before:border-l before:border-[#ffd400] after:content-[''] after:absolute after:-bottom-px after:-right-px after:w-4 after:h-4 after:border-b after:border-r after:border-[#ffd400]">
              <h4 className="text-xs uppercase tracking-widest text-[#ffd400] font-bold mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#d31438]" />
                Direct Enterprise Desk
              </h4>
              <p className="text-xs text-[#9a9a9a] mb-3 leading-relaxed">
                Need an immediate custom quote or formal university proposal? Write to us directly:
              </p>
              <a
                href="mailto:festora@221blabs.com"
                className="text-base sm:text-lg font-bold text-[#ffd400] hover:text-yellow-300 hover:underline tracking-wide font-mono block mb-2 transition-colors"
              >
                festora@221blabs.com
              </a>
              <div className="flex items-center gap-2 text-[0.7rem] text-[#858585] uppercase tracking-widest font-semibold">
                <Clock className="w-3.5 h-3.5 text-[#ffd400]" />
                <span>Typical response time: Under 4 hours</span>
              </div>
            </div>

            {/* Social Proof / Guarantee Banner */}
            <div className="p-5 bg-[#121212] border border-[#3f1119] relative flex items-center gap-4">
              <div className="w-12 h-12 bg-[#090909] border border-[#3f1119] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-[#ffd400]" />
              </div>
              <div>
                <h5 className="font-bold text-xs uppercase tracking-wider text-[#e8e8e8]">
                  3 Events Complimentary Trial
                </h5>
                <p className="text-xs text-[#9a9a9a] mt-0.5">
                  Accredited universities and college student councils receive an extended trial period.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Request Form or Success Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <AnimatePresence mode="wait">
              {submittedInquiryId ? (
                /* Success State */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#121212] border border-[#3f1119] p-8 sm:p-12 text-center relative before:content-[''] before:absolute before:-top-px before:-left-px before:w-4 before:h-4 before:border-t before:border-l before:border-[#ffd400] after:content-[''] after:absolute after:-bottom-px after:-right-px after:w-4 after:h-4 after:border-b after:border-r after:border-[#ffd400]"
                >
                  <div className="w-20 h-20 bg-[#090909] border border-[#3f1119] rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-[#ffd400]" />
                  </div>

                  <span className="text-[#ffd400] text-xs uppercase tracking-widest font-bold block mb-2">
                    Request Transmitted Successfully
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-bold font-[family-name:var(--font-marcellus)] uppercase tracking-wide text-[#e8e8e8] mb-4">
                    We&apos;re On It, {formData.name.split(' ')[0]}!
                  </h3>

                  <p className="text-sm sm:text-base text-[#9a9a9a] max-w-lg mx-auto leading-relaxed mb-6 font-[family-name:var(--font-josefin)]">
                    Your enterprise inquiry for <strong className="text-[#ffd400]">{formData.organization}</strong> has been received.
                    All details have been forwarded to our team at <strong className="text-[#ffd400]">festora@221blabs.com</strong>.
                  </p>

                  <div className="bg-[#090909] border border-[#3f1119] p-4 max-w-sm mx-auto mb-8">
                    <span className="text-[0.65rem] text-[#858585] uppercase tracking-widest block mb-1">
                      Inquiry Reference ID
                    </span>
                    <span className="font-mono text-lg font-bold text-[#ffd400] tracking-wider">
                      {submittedInquiryId}
                    </span>
                  </div>

                  <p className="text-xs text-[#858585] max-w-md mx-auto mb-8 leading-relaxed">
                    A confirmation email has also been sent to <strong className="text-[#e8e8e8]">{formData.email}</strong>.
                    Our solutions director will reach out within 24 hours to schedule your personalized walkthrough.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/"
                      className="proceed-button text-center w-full sm:w-auto !mt-0 px-8 py-3.5 inline-block"
                    >
                      Return to Home
                    </Link>
                    <button
                      onClick={() => {
                        setSubmittedInquiryId(null);
                        setFormData({
                          name: '',
                          email: '',
                          phone: '',
                          organization: '',
                          role: 'Student Fest Convener',
                          attendees: '3,000 - 5,000',
                          eventType: 'College Cultural Fest',
                          timeline: '1 - 3 months',
                          message: ''
                        });
                      }}
                      className="w-full sm:w-auto px-8 py-3.5 bg-transparent border border-[#3f1119] text-[#ffd400] hover:border-[#ffd400] font-bold text-xs uppercase tracking-[2px] transition-all rounded-[11px]"
                    >
                      Submit Another Request
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* Interactive Form in Existing UI Specification */
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-[#121212] border border-[#3f1119] p-6 sm:p-10 relative before:content-[''] before:absolute before:-top-px before:-left-px before:w-4 before:h-4 before:border-t before:border-l before:border-[#ffd400] after:content-[''] after:absolute after:-bottom-px after:-right-px after:w-4 after:h-4 after:border-b after:border-r after:border-[#ffd400]"
                >
                  <div className="border-b border-[#4a101b] pb-4 mb-6">
                    <h2 className="section-title !border-b-0 !pb-0">
                      Enterprise Inquiry Form
                    </h2>
                    <p className="section-description">
                      Please tell us about your organization and requirements. All details will be securely forwarded directly to{' '}
                      <span className="text-[#ffd400] font-mono font-bold">festora@221blabs.com</span>.
                    </p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-[#1a0509] border border-[#d31438] text-red-300 text-xs sm:text-sm mb-6 flex items-start gap-3"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#ffd400]" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Full Name & Official Email */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="form-group !mt-0">
                        <label className="form-label">
                          Your Full Name <span className="text-[#d31438]">*</span>
                        </label>
                        <div className="input-wrapper">
                          <User className="input-icon" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Arvind Sharma"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="form-group !mt-0">
                        <label className="form-label">
                          Official / College Email <span className="text-[#d31438]">*</span>
                        </label>
                        <div className="input-wrapper">
                          <Mail className="input-icon" />
                          <input
                            type="email"
                            required
                            placeholder="e.g. convener@university.edu"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="form-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone / WhatsApp & Organization */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="form-group !mt-0">
                        <label className="form-label">
                          Phone / WhatsApp Number <span className="text-[#d31438]">*</span>
                        </label>
                        <div className="input-wrapper">
                          <Phone className="input-icon" />
                          <input
                            type="tel"
                            required
                            placeholder="e.g. +91 98765 43210"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="form-input"
                          />
                        </div>
                      </div>

                      <div className="form-group !mt-0">
                        <label className="form-label">
                          Institution / Organization <span className="text-[#d31438]">*</span>
                        </label>
                        <div className="input-wrapper">
                          <Building2 className="input-icon" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. IIT Delhi / BITS Pilani"
                            value={formData.organization}
                            onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                            className="form-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Designation / Role */}
                    <div className="form-group !mt-0">
                      <label className="form-label">
                        Your Role / Designation
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="form-select cursor-pointer"
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Estimated Scale & Event Format */}
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="form-group !mt-0">
                        <label className="form-label">
                          Estimated Attendee Scale
                        </label>
                        <select
                          value={formData.attendees}
                          onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                          className="form-select cursor-pointer"
                        >
                          {attendeeScales.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group !mt-0">
                        <label className="form-label">
                          Event Category / Format
                        </label>
                        <select
                          value={formData.eventType}
                          onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
                          className="form-select cursor-pointer"
                        >
                          {eventTypes.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="form-group !mt-0">
                      <label className="form-label">
                        Target Event Timeline
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {timelines.map((timeOption) => (
                          <button
                            key={timeOption}
                            type="button"
                            onClick={() => setFormData({ ...formData, timeline: timeOption })}
                            className={`py-2.5 px-3 text-xs uppercase tracking-wider transition-all text-center ${
                              formData.timeline === timeOption
                                ? 'border border-[#ffd400] bg-[#ffd400]/10 text-[#ffd400] font-bold shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                                : 'border border-[#3f1119] bg-transparent text-[#9a9a9a] hover:border-[#d31438] hover:text-[#e8e8e8]'
                            }`}
                          >
                            {timeOption}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Requirements & Notes */}
                    <div className="form-group !mt-0">
                      <label className="form-label">
                        Specific Event Goals &amp; Requirements (Optional)
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Tell us about ticket tiers, scanner devices required, white-label needs, sponsorship integration, or any custom features you need..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="form-textarea leading-relaxed"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="proceed-button flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Spinner />
                          <span>Dispatching Request...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Enterprise Request</span>
                          <Send className="w-4 h-4 text-white" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-[#858585] leading-relaxed mt-3">
                      By submitting, you agree to have Festora contact you regarding enterprise ticketing solutions.
                      We never share or sell your data.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
