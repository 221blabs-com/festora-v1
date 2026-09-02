'use client';

import { useFormContext } from 'react-hook-form';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const eventCategories = [
  'Technology', 'Business', 'Education', 'Arts & Culture',
  'Sports', 'Health & Wellness', 'Social', 'Entertainment',
  'Science', 'Workshop', 'Conference', 'Networking'
];

export function BasicInfoStep() {
  const {
    register,
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useFormContext();

  const selectedCategories = (watch('categories') as string[]) || [];
  const eventType = watch('eventType') as 'in-person' | 'online' | 'hybrid' | undefined;

  const toggleCategory = (category: string) => {
    const current = (getValues('categories') as string[]) || [];
    if (current.includes(category)) {
      setValue('categories', current.filter((c: string) => c !== category));
    } else {
      setValue('categories', [...current, category]);
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
          Basic Information
        </h2>
        <p className="text-gray-400 mb-6">
          Let&apos;s start with the basics. Give your event a compelling title and select its type.
        </p>
      </div>

      {/* Event Title */}
      <div>
        <label className="block text-sm font-medium mb-3 text-gray-300">
          Event Title *
        </label>
        <input
          type="text"
          {...register('title')}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
          placeholder="Enter a compelling event title..."
          maxLength={120}
        />
        <div className="flex justify-between mt-2">
          <div>
            {errors.title && (
              <p className="text-red-400 text-sm flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.title.message as string}
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {watch('title')?.length || 0}/120 characters
          </p>
        </div>
      </div>

      {/* Event Subtitle */}
      <div>
        <label className="block text-sm font-medium mb-3 text-gray-300">
          Short Subtitle (Optional)
        </label>
        <input
          type="text"
          {...register('subtitle')}
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white placeholder-gray-400 transition-all"
          placeholder="Add a brief description..."
        />
        <p className="text-xs text-gray-500 mt-2">
          A short tagline to complement your title
        </p>
      </div>

      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium mb-4 text-gray-300">
          Event Type *
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: 'in-person', label: 'In-Person', description: 'Physical venue' },
            { value: 'online', label: 'Online', description: 'Virtual event' },
            { value: 'hybrid', label: 'Hybrid', description: 'Both online & offline' }
          ].map((type) => (
            <label
              key={type.value}
              className={`relative flex cursor-pointer rounded-xl p-4 border-2 transition-all duration-300 ${
                eventType === type.value
                  ? 'border-violet-500/50 bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-sm'
                  : 'border-gray-700/50 hover:border-gray-600/50 bg-gray-800/30'
              }`}
            >
              <input
                type="radio"
                {...register('eventType')}
                value={type.value}
                className="sr-only"
              />
              <div className="flex flex-col">
                <span className="font-semibold text-white mb-1">
                  {type.label}
                </span>
                <span className="text-sm text-gray-400">
                  {type.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium mb-4 text-gray-300">
          Categories *
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Select categories that best describe your event (you can select multiple)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {eventCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => toggleCategory(category)}
              className={`px-3 py-2.5 text-sm rounded-xl border transition-all duration-300 ${
                selectedCategories.includes(category)
                  ? 'border-violet-500/50 bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-300 font-semibold shadow-sm'
                  : 'border-gray-700/50 text-gray-300 hover:border-gray-600/50 hover:bg-gray-800/30'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
        {errors.categories && (
          <p className="text-red-400 text-sm mt-3 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.categories.message as string}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Selected: {selectedCategories.length} categories
        </p>
      </div>
    </motion.div>
  );
}
