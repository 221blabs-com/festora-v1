'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { Mail, Phone, CheckCircle, MessageCircle } from 'lucide-react';

interface Organizer {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
  email: string;
  phone: string;
  description: string;
}

interface OrganizerCardProps {
  organizer: Organizer;
}

export function OrganizerCard({ organizer }: OrganizerCardProps) {
  const handleContact = (type: 'email' | 'phone' | 'message') => {
    switch (type) {
      case 'email':
        window.open(`mailto:${organizer.email}`);
        break;
      case 'phone':
        window.open(`tel:${organizer.phone}`);
        break;
      case 'message':
        // In real app, open messaging modal or navigate to chat
        console.log('Open message modal');
        break;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="p-6 sm:p-8"
    >
      <h3 className="text-lg font-semibold mb-4 text-white">
        Event Organizer
      </h3>

      <div className="flex items-center gap-4 mb-4">
        <Image
          src={organizer.avatar}
          alt={organizer.name}
          width={64}
          height={64}
          className="rounded-full object-cover ring-2 ring-violet-500/30"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white">
              {organizer.name}
            </h4>
            {organizer.verified && (
              <CheckCircle className="w-5 h-5 text-violet-400" />
            )}
          </div>
          <p className="text-sm text-gray-300">
            {organizer.description}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => handleContact('message')}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Contact Organizer
        </button>

        <div className="flex gap-2">
          <button
            onClick={() => handleContact('email')}
            className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-gray-700/50"
          >
            <Mail className="w-4 h-4" />
            Email
          </button>

          <button
            onClick={() => handleContact('phone')}
            className="flex-1 bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 py-2 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-gray-700/50"
          >
            <Phone className="w-4 h-4" />
            Call
          </button>
        </div>
      </div>
    </motion.div>
  );
}
