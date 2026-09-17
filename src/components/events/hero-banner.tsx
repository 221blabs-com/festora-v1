'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Share2,
  Clock,
} from 'lucide-react';

interface HeroBannerProps {
  image: string;
  title: string;
  subtitle?: string;
  startDate: string;
  endDate: string;
  venue: string;
  venueAddress?: string;
  isOnline: boolean;
  minPrice: number;
}

export function HeroBanner({
  image,
  title,
  subtitle,
  startDate,
  endDate,
  venue,
  venueAddress,
  isOnline,
  minPrice,
}: HeroBannerProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: subtitle,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="relative h-[60vh] min-h-[500px] overflow-hidden">
      {/* Background Image */}
      {image && image.trim() !== '' ? (
        <Image
          src={image}
          alt={title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      ) : (
        // Fallback background when no image is provided
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className="absolute inset-0 flex items-end">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl"
          >
            {/* Price Badge */}
            {minPrice === 0 ? (
              <span className="inline-block px-4 py-2 bg-emerald-600/90 text-white text-sm font-semibold rounded-full mb-4 border border-emerald-400/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                FREE ADMISSION
              </span>
            ) : (
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-yellow-300 text-sm font-bold rounded-full mb-4 border border-yellow-400/60 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                From ₹{minPrice}
              </span>
            )}

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
              {title}
            </h1>

            {subtitle && (
              <p className="text-xl md:text-2xl text-gray-200 mb-8 leading-relaxed">
                {subtitle}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-6 text-white">
              {/* Date & Time */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">{formatDate(startDate)}</p>
                  <p className="text-sm text-gray-200">
                    {formatTime(startDate)} - {formatTime(endDate)}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold">{venue}</p>
                  {venueAddress && (
                    <p className="text-sm text-gray-200">{venueAddress}</p>
                  )}
                  {isOnline && (
                    <p className="text-sm text-gray-200">Online Event</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Share Button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            onClick={handleShare}
            className="absolute top-8 right-8 p-3 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
            aria-label="Share event"
          >
            <Share2 className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
