'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Send, Loader2, CheckCircle, Plus, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';

interface SimpleEventRequest {
  eventTitle: string;
  organizationName: string;
  contactEmail: string;
  phoneNumber: string;
  eventDescription: string;
  preferredDate: string;
  eventType: 'conference' | 'workshop' | 'seminar' | 'festival' | 'other';
  estimatedAttendees: number;
  additionalNotes: string;
}

export default function SimpleEventRequestForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<SimpleEventRequest>({
    eventTitle: '',
    organizationName: '',
    contactEmail: user?.email || '',
    phoneNumber: '',
    eventDescription: '',
    preferredDate: '',
    eventType: 'conference',
    estimatedAttendees: 50,
    additionalNotes: '',
  });

  const validatePhoneNumber = (phone: string): boolean => {
    // Indian phone number validation: 10 digits
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const handleInputChange = (field: keyof SimpleEventRequest, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('Please log in to submit an event request');
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      setError('Invalid phone number. Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/simple-event-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          ...formData,
          userId: user.uid,
          submittedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      setSubmitted(true);
      setTimeout(() => {
        router.push('/dashboard/requests');
      }, 2000);

    } catch (error) {
      console.error('Error submitting request:', error);
      setError('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[var(--bg)] py-20 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-[family-name:var(--font-josefin)]">
        <div className="max-w-2xl w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-12 text-center relative"
          >


            
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
              Request Submitted Successfully!
            </h2>
            <p className="text-lg text-[var(--fg-muted)] mb-6">
              Thank you for your event request. We&apos;ll review it and get back to you soon.
            </p>
            <Spinner />
            <p className="text-sm text-[var(--fg-muted)] uppercase tracking-widest">Redirecting to your requests...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-20 px-4 sm:px-6 lg:px-8 font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="fixed inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] w-full p-8 text-center relative">


            
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full border border-[var(--primary)] flex items-center justify-center mr-6 bg-[var(--bg)] shadow-[0_0_15px_var(--primary-glow)]">
                 <Plus className="w-6 h-6 text-[var(--primary)]" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">
                Create Your <span className="text-[var(--primary)]">Event</span>
              </h1>
            </div>
            <p className="text-lg text-[var(--fg-muted)] uppercase tracking-wide text-xs font-bold">
              Submit your event idea and we&apos;ll create a custom event page for you
            </p>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] w-full p-8 relative"
        >


          
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 mb-6 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Event Title & Organization - Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="deco-label">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.eventTitle}
                    onChange={(e) => handleInputChange('eventTitle', e.target.value)}
                    className="deco-input"
                    placeholder="Enter your event title"
                  />
                </div>

                <div>
                  <label className="deco-label">
                    Organization/Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organizationName}
                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                    className="deco-input"
                    placeholder="Your organization name"
                  />
                </div>
              </div>

              {/* Contact Email & Phone - Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="deco-label">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className="deco-input"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                   <label className="deco-label">
                    Phone Number (10 digits) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-muted)] text-sm">+91</span>
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        // Only allow numbers and limit length
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 10) handleInputChange('phoneNumber', val);
                      }}
                      className="deco-input pl-10"
                      placeholder="9876543210"
                    />
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="deco-label">
                    Event Type *
                  </label>
                  <select
                    required
                    value={formData.eventType}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    className="deco-input bg-[var(--bg-card)]"
                  >
                    <option value="conference">Conference</option>
                    <option value="workshop">Workshop</option>
                    <option value="seminar">Seminar</option>
                    <option value="festival">Festival</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                   <label className="deco-label">
                    Estimated Attendees *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.estimatedAttendees}
                    onChange={(e) => handleInputChange('estimatedAttendees', parseInt(e.target.value) || 0)}
                    className="deco-input"
                  />
                </div>
              </div>

               <div>
                <label className="deco-label">
                  Preferred Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.preferredDate}
                  onChange={(e) => handleInputChange('preferredDate', e.target.value)}
                  className="deco-input opacity-70 focus:opacity-100"
                />
              </div>

              <div>
                <label className="deco-label">
                  Event Description *
                </label>
                <textarea
                  required
                  value={formData.eventDescription}
                  onChange={(e) => handleInputChange('eventDescription', e.target.value)}
                  rows={4}
                  className="deco-input min-h-[100px] py-2"
                  placeholder="Describe your event, its purpose, and target audience..."
                />
              </div>

              <div>
                <label className="deco-label">
                  Additional Notes
                </label>
                <textarea
                  value={formData.additionalNotes}
                  onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                  rows={2}
                  className="deco-input min-h-[60px] py-2"
                  placeholder="Any specific requirements or questions?"
                />
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-4 bg-[var(--primary)] text-[var(--fg)] border border-[var(--primary)] hover:bg-[var(--primary-light)] hover:shadow-[0_0_20px_var(--primary-glow)] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest text-xs font-bold transition-all duration-300 flex items-center gap-2 group"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner inline />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
        </motion.div>
      </div>
    </div>
  );
}
