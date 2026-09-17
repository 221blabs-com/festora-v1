'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ArrowRight, Ticket } from 'lucide-react';

interface RelatedEvent {
  id: string;
  title: string;
  image: string;
  startDate: string;
  venue: string;
  price: number;
  category: string;
}

interface RelatedEventsProps {
  currentEventId: string;
}

// Mock related events data
const mockRelatedEvents: RelatedEvent[] = [
  {
    id: '2',
    title: 'Workshop: Machine Learning Basics',
    image: '/api/placeholder/400/250',
    startDate: '2025-10-05T14:00:00',
    venue: 'Computer Lab, IIT Delhi',
    price: 500,
    category: 'Workshop',
  },
  {
    id: '3',
    title: 'AI Ethics Symposium',
    image: '/api/placeholder/400/250',
    startDate: '2025-10-15T09:00:00',
    venue: 'Main Auditorium, IIT Delhi',
    price: 0,
    category: 'Conference',
  },
  {
    id: '4',
    title: 'Startup Pitch Competition',
    image: '/api/placeholder/400/250',
    startDate: '2025-11-01T18:00:00',
    venue: 'Innovation Center',
    price: 200,
    category: 'Competition',
  },
];

export function RelatedEvents({ currentEventId }: RelatedEventsProps) {
  const [relatedEvents, setRelatedEvents] = useState<RelatedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch related events
    const fetchRelatedEvents = async () => {
      // Filter out current event and limit to 3 related events
      const filtered = mockRelatedEvents.filter(event => event.id !== currentEventId).slice(0, 3);
      setRelatedEvents(filtered);
      setLoading(false);
    };

    fetchRelatedEvents();
  }, [currentEventId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Related Events
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-300 dark:bg-gray-700 h-48 rounded-lg mb-4"></div>
              <div className="bg-gray-300 dark:bg-gray-700 h-4 rounded mb-2"></div>
              <div className="bg-gray-300 dark:bg-gray-700 h-4 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (relatedEvents.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          You Might Also Like
        </h2>
        <Link
          href="/events"
          className="text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1"
        >
          View All Events
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-gray-900/60 to-gray-800/60 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-500 group"
          >
            <Link href={`/events/${event.id}`}>
              <div className="relative h-48 bg-gradient-to-br from-violet-600/20 via-purple-600/15 to-amber-500/10 flex items-center justify-center overflow-hidden">
                {/* Background pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_70%)]" />
                <Calendar className="w-12 h-12 text-violet-400/60 group-hover:text-violet-400/80 transition-colors duration-300" />

                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-gradient-to-r from-violet-500/20 to-purple-500/20 backdrop-blur-sm text-xs font-medium text-violet-300 rounded-full border border-violet-500/30">
                    {event.category}
                  </span>
                </div>
                {event.price === 0 ? (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-green-500/90 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                      FREE
                    </span>
                  </div>
                ) : (
                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 bg-black/70 backdrop-blur-sm text-amber-300 text-xs font-medium rounded-full border border-amber-400/50">
                      From ₹{event.price}
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="font-semibold text-white mb-3 line-clamp-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-violet-400 group-hover:to-amber-400 group-hover:bg-clip-text transition-all duration-300">
                  {event.title}
                </h3>

                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <Calendar className="w-3 h-3 text-violet-400" />
                    </div>
                    <span>{formatDate(event.startDate)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-pink-500/20 flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-pink-400" />
                    </div>
                    <span className="truncate">{event.venue}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <span className="text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1">
                    Learn More
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
