'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Clock, User } from 'lucide-react';

interface Speaker {
  name: string;
  title: string;
  avatar: string;
}

interface AgendaItem {
  time: string;
  title: string;
  description: string;
  speaker: Speaker | null;
}

interface AgendaTimelineProps {
  agenda: AgendaItem[];
}

export function AgendaTimeline({ agenda }: AgendaTimelineProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 sm:p-6 lg:p-8"
    >
      <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-white">
        Event Agenda
      </h2>

      <div className="relative">
        {/* Timeline line - Adjusted for mobile */}
        <div className="absolute left-4 sm:left-6 top-0 bottom-0 w-0.5 bg-gray-600/50" />

        <div className="space-y-4 sm:space-y-6">
          {agenda.map((item, index) => (
            <div key={index} className="relative flex gap-3 sm:gap-6">
              {/* Timeline dot - Smaller on mobile */}
              <div className="relative flex-shrink-0">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-violet-500/20 rounded-full flex items-center justify-center border-2 sm:border-4 border-gray-800/60 shadow-sm backdrop-blur-sm">
                  <Clock className="w-3 h-3 sm:w-5 sm:h-5 text-violet-400" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4 sm:pb-6">
                <div className="flex flex-col gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-1 xs:gap-2">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-medium text-violet-400 mt-0.5">
                        {item.time}
                      </p>
                    </div>
                  </div>

                  {item.speaker && (
                    <div className="flex items-center gap-2 bg-gray-800/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5 sm:px-3 sm:py-2 border border-gray-700/50 w-fit">
                      <Image
                        src={item.speaker.avatar}
                        alt={item.speaker.name}
                        width={24}
                        height={24}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover ring-1 sm:ring-2 ring-violet-500/30 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-white truncate">
                          {item.speaker.name}
                        </p>
                        <p className="text-xs text-gray-400 truncate hidden xs:block">
                          {item.speaker.title}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
