'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Users,
  DollarSign,
  Search,
  Menu,
  X,
  BarChart3,
  LogOut
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface Event {
  id: string;
  title: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  ticketsSold: number;
  totalTickets: number;
  revenue: number;
  organizerName: string;
}

interface EventSidebarProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventSelect: (event: Event) => void;
  expanded: boolean;
  onToggle: () => void;
  organizerName: string;
  onLogout: () => void;
  loading: boolean;
}

export default function EventSidebar({
  events,
  selectedEvent,
  onEventSelect,
  expanded,
  onToggle,
  organizerName,
  onLogout,
  loading
}: EventSidebarProps) {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && expanded) {
        onToggle();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [expanded, onToggle]);

  const filteredEvents = events.filter(event => {
    const matchesFilter = filter === 'all' || event.status === filter;
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.organizerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-blue-400 bg-blue-600/20';
      case 'ongoing': return 'text-green-400 bg-green-600/20';
      case 'completed': return 'text-gray-400 bg-gray-600/20';
      default: return 'text-gray-400 bg-gray-600/20';
    }
  };

  const formatRevenue = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      {/* Collapsed Sidebar */}
      <motion.div
        ref={sidebarRef}
        initial={false}
        animate={{
          width: expanded ? 320 : 64,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="bg-gray-900/95 backdrop-blur-sm border-r border-gray-800 h-full flex flex-col relative z-50"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            {expanded ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h1 className="text-white font-semibold text-sm">Analytics</h1>
                    <p className="text-gray-400 text-xs">{organizerName}</p>
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </>
            ) : (
              <button
                onClick={onToggle}
                className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center mx-auto"
              >
                <Menu className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Content - Only show when expanded */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Search and Filter */}
              <div className="p-4 border-b border-gray-800 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-1">
                  {(['all', 'upcoming', 'ongoing', 'completed'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilter(status)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        filter === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Events List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center">
                    <Spinner />
                    <p className="text-gray-400 text-sm">Loading events...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="p-4 text-center">
                    <Calendar className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No events found</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {filteredEvents.map((event) => (
                      <motion.button
                        key={event.id}
                        onClick={() => onEventSelect(event)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-3 rounded-lg text-left transition-all ${
                          selectedEvent?.id === event.id
                            ? 'bg-blue-600/20 border border-blue-500/50'
                            : 'bg-gray-800/50 hover:bg-gray-800 border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-white font-medium text-sm line-clamp-2 flex-1 mr-2">
                            {event.title}
                          </h3>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(event.status)}`}>
                            {event.status}
                          </span>
                        </div>

                        <div className="space-y-1 text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(event.date).toLocaleDateString('en-GB')}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{event.ticketsSold}/{event.totalTickets} registered</span>
                          </div>

                          {event.revenue > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              <span>{formatRevenue(event.revenue)}</span>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-400 bg-red-600/10 hover:bg-red-600/20 rounded-lg transition-colors text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed State Icons */}
        {!expanded && (
          <div className="flex-1 flex flex-col items-center py-4 space-y-4">
            {/* Event indicators */}
            <div className="space-y-2">
              {events.slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  onClick={() => {
                    onEventSelect(event);
                    onToggle();
                  }}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    selectedEvent?.id === event.id
                      ? 'bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                  title={event.title}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    event.status === 'upcoming' ? 'bg-blue-400' :
                    event.status === 'ongoing' ? 'bg-green-400' :
                    'bg-gray-400'
                  }`} />
                </button>
              ))}
              {events.length > 3 && (
                <button
                  onClick={onToggle}
                  className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                  title={`+${events.length - 3} more events`}
                >
                  <span className="text-xs text-gray-400">+{events.length - 3}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
