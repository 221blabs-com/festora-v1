'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Calendar, MapPin, Users, Ticket, Clock, Eye, EyeOff } from 'lucide-react';

interface TicketTier {
  name?: string;
  price: number;
  capacity?: number;
  description?: string;
}

interface AgendaItem {
  time: string;
  title: string;
  description?: string;
  speaker?: string;
}

interface EventFormData {
  title?: string;
  subtitle?: string;
  shortDescription?: string;
  description?: string;
  bannerImage?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  address?: string;
  city?: string;
  tiers?: TicketTier[];
  agenda?: AgendaItem[];
  categories?: string[];
  tags?: string[];
}

interface EventPreviewProps {
  formData: EventFormData;
  isVisible: boolean;
}

export function EventPreview({ formData, isVisible }: EventPreviewProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date TBD';
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const minPrice = formData.tiers && formData.tiers.length > 0
    ? Math.min(...formData.tiers.map((tier) => tier.price || 0))
    : 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-600" />
              <h3 className="font-medium text-gray-900 dark:text-white">Live Preview</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              See how your event will appear to attendees
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Banner Image */}
            {formData.bannerImage ? (
              <div className="relative h-32 rounded-lg overflow-hidden">
                <Image
                  src={formData.bannerImage}
                  alt="Event banner"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-3 left-3">
                  {minPrice === 0 ? (
                    <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                      FREE
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-violet-500 text-white text-xs font-medium rounded">
                      From ₹{minPrice}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-32 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <p className="text-gray-500 text-sm">No banner image</p>
              </div>
            )}

            {/* Event Title */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                {formData.title || 'Event Title'}
              </h2>
              {formData.subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {formData.subtitle}
                </p>
              )}
            </div>

            {/* Event Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300">
                  {formatDate(formData.startDate || '')}
                  {formData.startDate && ` • ${formatTime(formData.startDate)}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-300 truncate">
                  {formData.venue || 'Venue TBD'}
                </span>
              </div>

              {formData.tiers && formData.tiers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-300">
                    {formData.tiers.reduce((sum: number, tier: TicketTier) => sum + (tier.capacity || 0), 0)} capacity
                  </span>
                </div>
              )}
            </div>

            {/* Categories */}
            {formData.categories && formData.categories.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-1">
                  {formData.categories.slice(0, 3).map((category: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 text-xs rounded"
                    >
                      {category}
                    </span>
                  ))}
                  {formData.categories.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded">
                      +{formData.categories.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Description Preview */}
            {formData.description && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
                  Description
                </h4>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none line-clamp-3"
                  dangerouslySetInnerHTML={{
                    __html: formData.description.slice(0, 200) + (formData.description.length > 200 ? '...' : '')
                  }}
                />
              </div>
            )}

            {/* Agenda Preview */}
            {formData.agenda && formData.agenda.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
                  Agenda ({formData.agenda.length} items)
                </h4>
                <div className="space-y-2">
                  {formData.agenda.slice(0, 2).map((item, index) => (
                    <div key={index} className="flex gap-3 text-sm">
                      <div className="flex items-center gap-1 text-gray-500 min-w-0">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{item.time || 'TBD'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {item.title || 'Agenda item'}
                        </p>
                        {item.speaker && (
                          <p className="text-xs text-gray-500">{item.speaker}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {formData.agenda.length > 2 && (
                    <p className="text-xs text-gray-500">
                      +{formData.agenda.length - 2} more items
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ticket Tiers Preview */}
            {formData.tiers && formData.tiers.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">
                  Tickets
                </h4>
                <div className="space-y-2">
                  {formData.tiers.map((tier, index) => (
                    <div key={index} className="flex justify-between items-center p-2 border border-gray-200 dark:border-gray-600 rounded text-sm">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {tier.name || `Tier ${index + 1}`}
                        </p>
                        {tier.description && (
                          <p className="text-xs text-gray-500">{tier.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {tier.price === 0 ? 'FREE' : `₹${tier.price || 0}`}
                        </p>
                        <p className="text-xs text-gray-500">{tier.capacity || 0} left</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Badge */}
            <div className="text-center">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                Draft • Pending Submission
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
