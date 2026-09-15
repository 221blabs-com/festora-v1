'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowRight, Building2, CheckCircle, Eye, EyeOff, Lock, User, Plus, Trash2, ChevronLeft, Calendar } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';
import { AVAILABLE_CATEGORIES, AVAILABLE_BADGES, Event, AgendaItem } from '@/types/event';

export default function OrganizerApplyPage() {
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 Data
  const [orgData, setOrgData] = useState({
    organizationName: '',
    contactName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    eventTypes: '',
    acceptedTerms: false,
  });

  // Step 2 Data
  const [eventData, setEventData] = useState<Partial<Event>>({
    title: '', description: '', shortDescription: '', image: '', startDate: '', endDate: '',
    venue: '', venueType: 'physical', location: { address: '', city: '', state: '', country: '' },
    virtualLink: '', price: 0, originalPrice: 0, currency: 'INR',
    category: 'Other', categories: [], tags: [], badges: [],
    capacity: undefined, isTeamEvent: false, teamSettings: { minTeamSize: 1, maxTeamSize: 4, allowIndividual: true },
    agenda: [], requirements: [], status: 'published', approvalStatus: 'pending', featured: false
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [createdEventId, setCreatedEventId] = useState<string>('');

  const handleOrgChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setOrgData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setOrgData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const updateEventData = (field: string, value: any) => {
    setEventData((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) return { ...prev, [field]: value };
      const [parent, child] = keys;
      const parentValue = prev[parent as keyof typeof prev];
      return {
        ...prev,
        [parent]: {
          ...(typeof parentValue === 'object' && parentValue !== null ? parentValue : {}),
          [child]: value
        }
      };
    });
  };

  const addTag = (tag: string) => {
    if (tag && !eventData.tags?.includes(tag)) {
      setEventData(prev => ({ ...prev, tags: [...(prev.tags || []), tag] }));
    }
  };

  const nextStep = () => {
    if (!orgData.acceptedTerms) {
      setError('You must accept the platform conditions to proceed.');
      return;
    }
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(2);
  };

  const prevStep = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventData.title || !eventData.startDate || !eventData.endDate) {
      setError('Please fill in all required event fields (Title, Dates).');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        organizationDetails: orgData,
        eventDetails: eventData
      };

      const res = await fetch('/api/organizer/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      if (data.eventId) {
        setCreatedEventId(data.eventId);
      }
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg)] font-[family-name:var(--font-josefin)]">
        <main className="flex-1 flex items-center justify-center p-4 pt-24 pb-12">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg relative bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 md:p-12 text-center corner-bracket overflow-hidden shadow-2xl"
          >
            <div className="w-20 h-20 rounded-full mx-auto mb-6 border border-[var(--gold)] flex items-center justify-center bg-[var(--gold)]/10 text-[var(--gold)]">
              <CheckCircle className="w-10 h-10" />
            </div>

            <h1 className="text-3xl font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-3 uppercase tracking-widest">
              Event Submitted &<br/><span className="text-[var(--gold)]">Pending Approval</span>
            </h1>

            <p className="text-[var(--fg-muted)] mb-6">
              Thank you, <span className="text-[var(--fg)] font-semibold">{orgData.contactName || orgData.organizationName}</span>! Your organizer profile and inaugural event <span className="text-[var(--gold)] font-bold">&ldquo;{eventData.title}&rdquo;</span> have been submitted to the admin team for review and acceptance.
            </p>

            <div className="bg-[var(--bg)] border border-[var(--border-subtle)] p-5 rounded-lg mb-8 text-left text-sm space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[var(--fg-muted)]">Organizer Handle:</span>
                <span className="font-mono font-bold text-[var(--gold)] text-base">@{orgData.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--fg-muted)]">Registered Email:</span>
                <span className="text-[var(--fg)] font-medium text-xs sm:text-sm">{orgData.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--fg-muted)]">Approval Status:</span>
                <span className="inline-flex items-center gap-1.5 text-xs text-yellow-400 font-semibold bg-yellow-500/10 px-2.5 py-0.5 rounded-full border border-yellow-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse"></span>
                  Under Admin Review
                </span>
              </div>
              <p className="text-[11px] text-[var(--fg-muted)] pt-2 border-t border-[var(--border-subtle)] leading-relaxed">
                The administrator has received your contact details and event submission via email. Once accepted, you will receive an approval email with your dashboard login credentials to access and update your event.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/events" className="btn-primary inline-flex h-12 px-6 items-center justify-center font-bold">
                Browse Events
              </Link>
              <Link href="/organizer" className="px-6 h-12 inline-flex items-center justify-center bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-[var(--gold)] text-[var(--fg)] rounded-lg transition-all text-xs uppercase tracking-wider font-semibold">
                Organizer Portal
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] font-[family-name:var(--font-josefin)]">
      
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 pt-28 pb-20 relative">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wider">
            Become an <span className="text-[var(--primary)]">Organizer</span>
          </h1>
          <p className="text-[var(--fg-muted)] max-w-2xl mx-auto">
            {step === 1 ? 'Step 1: Set up your organizer profile and portal credentials.' : 'Step 2: Create your very first event to be published on approval.'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center mb-10">
           <div className="flex items-center gap-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step >= 1 ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border-subtle)] text-[var(--fg-muted)]'}`}>
                 1
              </div>
              <div className={`w-16 h-1 rounded-full ${step === 2 ? 'bg-[var(--primary)]' : 'bg-[var(--border-subtle)]'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${step === 2 ? 'border-[var(--primary)] bg-[var(--primary)] text-white' : 'border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--fg-muted)]'}`}>
                 2
              </div>
           </div>
        </div>

        <motion.div
          key={`step-${step}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 md:p-10 relative corner-bracket shadow-xl"
        >
          {error && (
            <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-red-500 text-sm rounded-lg">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organization Info */}
                <div className="space-y-6">
                  <h3 className="text-lg font-[family-name:var(--font-marcellus)] text-[var(--primary)] uppercase tracking-widest border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> 
                    Organization Details
                  </h3>

                  <div className="space-y-2">
                    <label className="deco-label">Organization Name</label>
                    <input
                      type="text"
                      name="organizationName"
                      required
                      value={orgData.organizationName}
                      onChange={handleOrgChange}
                      className="deco-input"
                      placeholder="e.g. TEDx University"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="deco-label">Types of Events Hosted</label>
                    <textarea
                      name="eventTypes"
                      rows={2}
                      value={orgData.eventTypes}
                      onChange={handleOrgChange}
                      className="deco-input"
                      placeholder="Hackathons, Concerts, Tech Talks..."
                    />
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-6">
                  <h3 className="text-lg font-[family-name:var(--font-marcellus)] text-[var(--primary)] uppercase tracking-widest border-b border-[var(--border-subtle)] pb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> 
                    Contact Person
                  </h3>

                  <div className="space-y-2">
                    <label className="deco-label">Full Name</label>
                    <input
                      type="text"
                      name="contactName"
                      required
                      value={orgData.contactName}
                      onChange={handleOrgChange}
                      className="deco-input"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="deco-label">Email</label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={orgData.email}
                        onChange={handleOrgChange}
                        className="deco-input"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="deco-label">Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={orgData.phone}
                        onChange={handleOrgChange}
                        className="deco-input"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Credentials */}
              <div className="space-y-6 pt-6 border-t border-[var(--border-subtle)]">
                 <h3 className="text-lg font-[family-name:var(--font-marcellus)] text-[var(--gold)] uppercase tracking-widest pb-2 flex items-center gap-2">
                   <Lock className="w-4 h-4" /> 
                   Portal Access Configuration
                 </h3>
                 <p className="text-sm text-[var(--fg-muted)] -mt-4 mb-4">Set up the credentials you will use to access your dashboard once approved.</p>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="deco-label">Desired Organizer Handle (Username)</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="username"
                          required
                          value={orgData.username}
                          onChange={handleOrgChange}
                          className="deco-input pl-10 lowercase"
                          placeholder="your-org-id"
                        />
                        <User className="absolute left-0 bottom-3 w-5 h-5 text-[var(--fg-muted)]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                       <label className="deco-label">Portal Password</label>
                       <div className="relative">
                         <input
                           type={showPassword ? 'text' : 'password'}
                           name="password"
                           required
                           value={orgData.password}
                           onChange={handleOrgChange}
                           className="deco-input pl-10 pr-10"
                           placeholder="••••••••"
                         />
                         <Lock className="absolute left-0 bottom-3 w-5 h-5 text-[var(--fg-muted)]" />
                         <button
                           type="button"
                           onClick={() => setShowPassword(!showPassword)}
                           className="absolute right-0 bottom-3 text-[var(--fg-muted)] hover:text-[var(--primary)] transition-colors"
                         >
                           {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                         </button>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Terms and Conditions */}
              <div className="pt-8 border-t border-[var(--border-subtle)]">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-1">
                    <input
                      type="checkbox"
                      name="acceptedTerms"
                      checked={orgData.acceptedTerms}
                      onChange={handleOrgChange}
                      className="peer sr-only"
                    />
                    <div className="w-5 h-5 border-2 border-[var(--border-subtle)] rounded-sm peer-checked:bg-[var(--primary)] peer-checked:border-[var(--primary)] transition-colors"></div>
                    <CheckCircle className="w-3 h-3 text-white absolute opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <div className="text-sm text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">
                    I agree to the <span className="text-[var(--primary)] underline underline-offset-4">Conditions to Use Platform</span>. I understand that my event details, ticketing, and organizational conduct must comply with Festora&apos;s community guidelines. All payouts verify KYC.
                  </div>
                </label>
              </div>

              <button
                onClick={nextStep}
                disabled={!orgData.organizationName || !orgData.username || !orgData.password || !orgData.acceptedTerms}
                className="btn-primary w-full h-14 text-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
              >
                Proceed to Event Creation <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="space-y-10">
               <button onClick={prevStep} className="flex items-center gap-2 text-[var(--fg-muted)] hover:text-[var(--primary)] transition-colors text-sm font-bold uppercase tracking-wider mb-2">
                 <ChevronLeft className="w-4 h-4" /> Back to Profile Setup
               </button>

               {/* Event Details Section */}
               <section>
                 <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[var(--primary)]" /> Basic Event Info
                 </h3>
                 <div className="space-y-6">
                   <div>
                     <label className="deco-label">Event Title *</label>
                     <input
                       type="text"
                       value={eventData.title}
                       onChange={(e) => updateEventData('title', e.target.value)}
                       className="deco-input text-lg font-bold"
                       placeholder="Enter event title"
                       required
                     />
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="deco-label">Start Date & Time *</label>
                        <input
                          type="datetime-local"
                          value={eventData.startDate?.slice(0, 16)}
                          onChange={(e) => updateEventData('startDate', e.target.value ? e.target.value + ':00Z' : '')}
                          className="deco-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="deco-label">End Date & Time *</label>
                        <input
                          type="datetime-local"
                          value={eventData.endDate?.slice(0, 16)}
                          onChange={(e) => updateEventData('endDate', e.target.value ? e.target.value + ':00Z' : '')}
                          className="deco-input"
                          required
                        />
                      </div>
                   </div>

                   <div>
                     <label className="deco-label">Full Description</label>
                     <textarea
                       value={eventData.description}
                       onChange={(e) => updateEventData('description', e.target.value)}
                       className="deco-input min-h-[150px]"
                       placeholder="Detailed description of your event..."
                     />
                   </div>

                   <div>
                     <label className="deco-label">Event Image URL</label>
                     <input
                       type="url"
                       value={eventData.image}
                       onChange={(e) => updateEventData('image', e.target.value)}
                       className="deco-input"
                       placeholder="https://example.com/image.jpg"
                     />
                     {eventData.image && (
                       <div className="mt-4 rounded-lg overflow-hidden border border-[var(--border-subtle)] p-2 bg-[var(--bg)] max-w-md">
                         <img src={eventData.image} alt="Preview" className="w-full h-48 object-cover rounded" />
                       </div>
                     )}
                   </div>
                 </div>
               </section>

               <section>
                  <h3 className="text-xl font-bold text-[var(--fg)] mb-6 font-[family-name:var(--font-marcellus)] uppercase border-b border-[var(--border-subtle)] pb-4">Venue & Tickets</h3>
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="deco-label">Venue Name or Virtual Link</label>
                          <input
                            type="text"
                            value={eventData.venue as string}
                            onChange={(e) => updateEventData('venue', e.target.value)}
                            className="deco-input"
                            placeholder="e.g., Auditorium A or Zoom Link"
                          />
                        </div>
                        <div>
                           <label className="deco-label">Category</label>
                           <select
                             value={eventData.category}
                             onChange={(e) => updateEventData('category', e.target.value)}
                             className="deco-input"
                           >
                             {AVAILABLE_CATEGORIES.map((cat) => (
                               <option key={cat} value={cat}>{cat}</option>
                             ))}
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--bg)] p-4 rounded-lg border border-[var(--border-subtle)]">
                        <div>
                          <label className="deco-label">Ticket Price (Set 0 for free)</label>
                          <div className="flex gap-3">
                            <input
                              type="number"
                              value={eventData.price}
                              onChange={(e) => updateEventData('price', parseFloat(e.target.value) || 0)}
                              className="flex-1 deco-input font-bold text-lg"
                              min="0"
                            />
                            <select
                              value={eventData.currency}
                              onChange={(e) => updateEventData('currency', e.target.value)}
                              className="deco-input w-24 font-bold"
                            >
                              <option value="INR">INR</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="deco-label">Total Capacity</label>
                          <input
                            type="number"
                            value={eventData.capacity || ''}
                            onChange={(e) => updateEventData('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
                            className="deco-input"
                            placeholder="Unlimited (Leave Empty)"
                            min="1"
                          />
                        </div>
                     </div>
                  </div>
               </section>

               <button
                 onClick={handleSubmit}
                 disabled={loading}
                 className="btn-primary w-full h-14 text-lg mt-8 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
               >
                 {loading ? <Spinner inline /> : <><CheckCircle className="w-5 h-5" /> Submit Full Application</>}
               </button>
            </div>
          )}

        </motion.div>
      </main>
    </div>
  );
}
