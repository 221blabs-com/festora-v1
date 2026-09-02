'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Send,
  Save,
  Calendar,
  MapPin,
  Users,
  Ticket,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface TicketTier {
  name?: string;
  price: number;
  capacity?: number;
  description?: string;
}

interface ReviewStepProps {
  onSubmit: (isDraft?: boolean) => Promise<void>;
  isSubmitting: boolean;
}

export function ReviewStep({ onSubmit, isSubmitting }: ReviewStepProps) {
  const { watch, formState: { errors } } = useFormContext();
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const formData = watch();

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalCapacity = formData.tiers?.reduce((sum: number, tier: TicketTier) => sum + (tier.capacity || 0), 0) || 0;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 sm:p-8 space-y-8"
    >
      {/* Validation Status */}
      <div className={`rounded-xl p-6 backdrop-blur-sm ${
        hasErrors 
          ? 'bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/30' 
          : 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30'
      }`}>
        <div className="flex items-center gap-4">
          {hasErrors ? (
            <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
          )}
          <div>
            <h3 className={`font-bold text-lg ${
              hasErrors ? 'text-red-300' : 'text-green-300'
            }`}>
              {hasErrors ? 'Please fix the following issues:' : 'Event is ready for submission!'}
            </h3>
            {hasErrors && (
              <ul className="text-sm text-red-300 mt-2 space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field}>• {field}: {error?.message as string}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Event Summary */}
      <div>
        <h2 className="text-2xl font-bold mb-6 text-white">
          Event Summary
        </h2>

        <div className="space-y-8">
          {/* Basic Info */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Title:</span>
                <p className="font-semibold text-white mt-1">{formData.title || 'Not set'}</p>
              </div>
              {formData.subtitle && (
                <div>
                  <span className="text-gray-400">Subtitle:</span>
                  <p className="font-semibold text-white mt-1">{formData.subtitle}</p>
                </div>
              )}
              <div>
                <span className="text-gray-400">Type:</span>
                <p className="font-semibold text-white mt-1 capitalize">{formData.eventType?.replace('-', ' ')}</p>
              </div>
              <div>
                <span className="text-gray-400">Categories:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.categories?.length > 0 ? formData.categories.map((category: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 text-xs rounded-full font-semibold border border-violet-500/30">
                      {category}
                    </span>
                  )) : (
                    <span className="text-gray-500">None selected</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Date & Venue */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Date & Venue</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-5 h-5 text-violet-400" />
                <div>
                  <span className="text-gray-400">Start:</span>
                  <span className="font-semibold text-white ml-2">{formatDate(formData.startDate)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-5 h-5 text-violet-400" />
                <div>
                  <span className="text-gray-400">End:</span>
                  <span className="font-semibold text-white ml-2">{formatDate(formData.endDate)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-5 h-5 text-violet-400" />
                <div>
                  <span className="text-gray-400">Venue:</span>
                  <span className="font-semibold text-white ml-2">{formData.venue || 'Not set'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets */}
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
            <h3 className="font-semibold text-white mb-4">Ticket Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Users className="w-5 h-5 text-violet-400" />
                <div>
                  <span className="text-gray-400">Total Capacity:</span>
                  <span className="font-semibold text-white ml-2">{totalCapacity} attendees</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Ticket className="w-5 h-5 text-violet-400" />
                <div>
                  <span className="text-gray-400">Ticket Tiers:</span>
                  <span className="font-semibold text-white ml-2">{formData.tiers?.length || 0} tiers</span>
                </div>
              </div>
            </div>
            
            {formData.tiers && formData.tiers.length > 0 && (
              <div className="mt-6">
                <div className="space-y-3">
                  {formData.tiers.map((tier: TicketTier, index: number) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-gray-800/50 rounded-xl border border-gray-700/30">
                      <div>
                        <span className="font-semibold text-white">{tier.name}</span>
                        {tier.description && (
                          <p className="text-xs text-gray-400 mt-1">{tier.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-white">
                          {tier.price === 0 ? 'FREE' : `₹${tier.price}`}
                        </p>
                        <p className="text-xs text-gray-400">{tier.capacity} capacity</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Media */}
          {formData.bannerImage && (
            <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
              <h3 className="font-semibold text-white mb-4">Media</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-400 text-sm">Banner Image:</span>
                  <div className="mt-3">
                    <Image
                      src={formData.bannerImage}
                      alt="Event banner"
                      width={400}
                      height={200}
                      className="rounded-xl object-cover w-full max-w-md"
                    />
                  </div>
                </div>
                {formData.gallery && formData.gallery.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Gallery: {formData.gallery.length} images</span>
                  </div>
                )}
                {formData.agenda && formData.agenda.length > 0 && (
                  <div>
                    <span className="text-gray-400 text-sm">Agenda: {formData.agenda.length} items</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
        <h3 className="font-semibold text-white mb-4">Terms and Conditions</h3>
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="terms"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 rounded border-gray-600 text-violet-600 focus:ring-violet-500 bg-gray-800"
            />
            <label htmlFor="terms" className="text-sm text-gray-300">
              I agree to the{' '}
              <a href="/terms" className="text-violet-400 hover:text-violet-300 underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-violet-400 hover:text-violet-300 underline">
                Privacy Policy
              </a>
              . I understand that my event will be reviewed by administrators before being published.
            </label>
          </div>
          
          <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-xl p-6 backdrop-blur-sm">
            <h4 className="font-semibold text-violet-300 mb-3">
              What happens next?
            </h4>
            <ul className="text-sm text-gray-300 space-y-2">
              <li>• Your event will be submitted for review</li>
              <li>• Admin review typically takes 1-2 business days</li>
              <li>• You&apos;ll receive an email notification once approved</li>
              <li>• Approved events will be visible in the event discovery</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Submit Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          type="button"
          onClick={() => onSubmit(true)}
          className="flex-1 px-6 py-3 border border-gray-600/50 text-gray-300 rounded-xl hover:bg-gray-800/50 transition-all flex items-center justify-center gap-2 font-medium"
        >
          <Save className="w-5 h-5" />
          Save Draft
        </button>
        
        <button
          type="button"
          onClick={() => onSubmit(false)}
          disabled={hasErrors || !agreedToTerms || isSubmitting}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium shadow-lg"
        >
          {isSubmitting ? (
            <>
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit for Approval
            </>
          )}
        </button>
      </div>
      
      {(!agreedToTerms || hasErrors) && (
        <p className="text-sm text-gray-400 text-center">
          {!agreedToTerms && 'Please agree to terms and conditions. '}
          {hasErrors && 'Please fix validation errors before submitting.'}
        </p>
      )}
    </motion.div>
  );
}
