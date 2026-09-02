'use client';

import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import { AlertCircle, MapPin, Globe, Calendar } from 'lucide-react';
import { RichTextEditor } from './rich-text-editor';

export function DetailsStep() {
  const {
    register,
    formState: { errors },
    watch,
    setValue
  } = useFormContext();

  const eventType = watch('eventType');
  const startDate = watch('startDate');

  // Set minimum date to today
  const today = new Date().toISOString().slice(0, 16);

  // Auto-set sales end time to 2 hours before event start
  const handleStartDateChange = (date: string) => {
    setValue('startDate', date);
    if (date) {
      const eventStart = new Date(date);
      const salesEnd = new Date(eventStart.getTime() - 2 * 60 * 60 * 1000); // 2 hours before
      setValue('tiers.0.salesEnd', salesEnd.toISOString().slice(0, 16));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 sm:p-8 space-y-8"
    >
      <div>
        <h2 className="text-2xl font-bold mb-4 text-white">
          Event Details
        </h2>
        <p className="text-gray-400 mb-6">
          Provide detailed information about your event including description, timing, and venue.
        </p>
      </div>

      {/* Rich Text Description */}
      <div>
        <label className="block text-sm font-medium mb-3 text-gray-300">
          Event Description *
        </label>
        <RichTextEditor
          value={watch('description')}
          onChange={(value) => setValue('description', value)}
          placeholder="Describe your event in detail. What can attendees expect? Include agenda highlights, speaker information, and any special features..."
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.description.message as string}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-2">
          Minimum 50 characters. Use rich formatting to make it engaging.
        </p>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            Start Date & Time *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="datetime-local"
              {...register('startDate')}
              onChange={(e) => handleStartDateChange(e.target.value)}
              min={today}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white transition-all"
            />
          </div>
          {errors.startDate && (
            <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.startDate.message as string}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            End Date & Time *
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="datetime-local"
              {...register('endDate')}
              min={startDate}
              className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white transition-all"
            />
          </div>
          {errors.endDate && (
            <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errors.endDate.message as string}
            </p>
          )}
        </div>
      </div>

      {/* Venue Information */}
      <div>
        <label className="block text-sm font-medium mb-3 text-gray-300">
          {eventType === 'online' ? 'Event Platform/Link' : 'Venue Name'} *
        </label>
        <div className="relative">
          {eventType === 'online' ? (
            <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          ) : (
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          )}
          <input
            type="text"
            {...register('venue')}
            className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
            placeholder={
              eventType === 'online' 
                ? "e.g., Zoom, Microsoft Teams, or custom platform"
                : "e.g., Main Auditorium, Conference Hall"
            }
          />
        </div>
        {errors.venue && (
          <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.venue.message as string}
          </p>
        )}
      </div>

      {/* Address/Link */}
      {eventType !== 'online' ? (
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            Venue Address
          </label>
          <textarea
            {...register('venueAddress')}
            rows={3}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all resize-none"
            placeholder="Full address including city, state, and postal code..."
          />
          <p className="text-xs text-gray-500 mt-2">
            Include complete address to help attendees find the venue
          </p>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium mb-3 text-gray-300">
            Meeting Link (Optional)
          </label>
          <input
            type="url"
            {...register('onlineLink')}
            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
            placeholder="https://zoom.us/j/123456789 or meeting platform URL"
          />
          <p className="text-xs text-gray-500 mt-2">
            Link will be shared with registered attendees
          </p>
        </div>
      )}

      {/* Hybrid Event Additional Info */}
      {eventType === 'hybrid' && (
        <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-xl p-6 backdrop-blur-sm">
          <h4 className="font-semibold text-violet-300 mb-3">
            Hybrid Event Setup
          </h4>
          <p className="text-sm text-gray-400 mb-4">
            For hybrid events, provide both physical venue details and online meeting information.
          </p>
          
          <div>
            <label className="block text-sm font-medium mb-3 text-gray-300">
              Online Meeting Link
            </label>
            <input
              type="url"
              {...register('onlineLink')}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
              placeholder="Meeting platform URL for remote attendees"
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}
