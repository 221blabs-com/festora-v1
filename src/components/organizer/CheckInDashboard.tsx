'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  CheckCircle,
  Users,
  Clock,
  Scan,
  RefreshCw,
  Sparkles,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { motion } from 'framer-motion';

interface DayStat {
  dayNumber: number;
  date: string;
  title?: string;
  registered: number;
  checkedIn: number;
  remaining: number;
}

interface CheckInDashboardProps {
  eventId: string;
  eventTitle: string;
  onOpenScanner?: (dayNumber?: number) => void;
}

export default function CheckInDashboard({
  eventId,
  eventTitle,
  onOpenScanner
}: CheckInDashboardProps) {
  const [days, setDays] = useState<DayStat[]>([]);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCheckInStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizer/checkin-stats?eventId=${encodeURIComponent(eventId)}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDays(data.days || []);
          setIsMultiDay(data.isMultiDay || false);
          setTotalRegistered(data.totalRegistered || 0);
        }
      }
    } catch (err) {
      console.error('Error fetching checkin stats:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchCheckInStats();
  }, [fetchCheckInStats]);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 mb-8 font-[family-name:var(--font-josefin)]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-[var(--gold)] flex items-center justify-center bg-[var(--bg)] shadow-[0_0_12px_var(--gold-glow)]">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide flex items-center gap-2">
              ORGANIZER CHECK-IN DASHBOARD
              {isMultiDay && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 font-sans normal-case">
                  Multi-Day Event
                </span>
              )}
            </h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Real-time attendance & day-specific entry verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenScanner && (
            <button
              onClick={() => onOpenScanner()}
              className="px-3.5 py-1.5 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Open Scanner</span>
            </button>
          )}
          <button
            onClick={fetchCheckInStats}
            disabled={loading}
            className="p-1.5 text-[var(--fg-muted)] hover:text-white border border-[var(--border-subtle)] rounded transition-colors"
            title="Refresh Check-in Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Spinner />
          <p className="text-xs text-[var(--gold)] mt-3 uppercase tracking-wider">Loading check-in metrics...</p>
        </div>
      ) : days.length === 0 ? (
        <div className="text-center py-8 text-[var(--fg-muted)] text-sm">
          No registration data found for this event.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((day) => {
            const checkInRate = day.registered > 0 ? Math.round((day.checkedIn / day.registered) * 100) : 0;

            return (
              <motion.div
                key={day.dayNumber}
                whileHover={{ y: -2 }}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-5 relative overflow-hidden transition-all hover:border-[var(--border-gold)]/40"
              >
                {/* Day Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold)] block">
                      {isMultiDay ? `DAY ${day.dayNumber}` : 'EVENT PASS'}
                    </span>
                    <h4 className="text-lg font-bold text-white font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                      {day.title || `Day ${day.dayNumber}`}
                    </h4>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--fg-muted)] mt-0.5">
                      <Calendar className="w-3 h-3 text-[var(--gold)]" />
                      <span>{day.date}</span>
                    </div>
                  </div>

                  <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-white/5 border border-white/10 text-white">
                    {checkInRate}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-white/5 h-1.5 rounded-full mb-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${checkInRate}%` }}
                  />
                </div>

                {/* Metrics Breakdown: Registered, Checked In, Remaining */}
                <div className="grid grid-cols-3 gap-2 text-center py-3 px-2 bg-[var(--bg-card)] border border-white/5 rounded-sm mb-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-[var(--fg-muted)] block">Registered</span>
                    <span className="text-base font-bold text-white font-[family-name:var(--font-marcellus)]">
                      {day.registered}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 block">Checked In</span>
                    <span className="text-base font-bold text-emerald-400 font-[family-name:var(--font-marcellus)]">
                      {day.checkedIn}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase tracking-wider text-amber-400 block">Remaining</span>
                    <span className="text-base font-bold text-amber-400 font-[family-name:var(--font-marcellus)]">
                      {day.remaining}
                    </span>
                  </div>
                </div>

                {/* Scan Button for this day */}
                {onOpenScanner && (
                  <button
                    onClick={() => onOpenScanner(day.dayNumber)}
                    className="w-full py-2 bg-white/5 hover:bg-[var(--gold)]/10 text-[var(--fg)] hover:text-[var(--gold)] border border-[var(--border-subtle)] hover:border-[var(--gold)]/40 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>Scan {isMultiDay ? `Day ${day.dayNumber}` : 'Passes'}</span>
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
