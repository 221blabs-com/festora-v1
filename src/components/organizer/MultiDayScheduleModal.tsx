'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Plus, Trash2, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import type { EventDay } from '@/types/event';

interface MultiDayScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  isMultiDay?: boolean;
  eventDays?: EventDay[];
  startDate?: string;
  endDate?: string;
  onSaved: (isMultiDay: boolean, eventDays: EventDay[]) => void;
}

export default function MultiDayScheduleModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  isMultiDay = false,
  eventDays = [],
  startDate = '',
  endDate = '',
  onSaved
}: MultiDayScheduleModalProps) {
  const [multiDayActive, setMultiDayActive] = useState<boolean>(Boolean(isMultiDay));
  
  // Initialize days
  const [days, setDays] = useState<EventDay[]>(() => {
    if (Array.isArray(eventDays) && eventDays.length > 0) {
      return eventDays;
    }
    const defaultDate = startDate ? startDate.slice(0, 10) : '';
    let nextDate = defaultDate;
    if (defaultDate) {
      try {
        const d = new Date(defaultDate);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().slice(0, 10);
      } catch {
        nextDate = defaultDate;
      }
    }
    return [
      { dayNumber: 1, date: defaultDate, startTime: '09:00', endTime: '18:00', title: 'Day 1' },
      { dayNumber: 2, date: nextDate, startTime: '09:00', endTime: '18:00', title: 'Day 2' }
    ];
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleAddDay = () => {
    const nextNumber = days.length + 1;
    let nextDate = '';
    const lastDay = days[days.length - 1];
    if (lastDay && lastDay.date) {
      try {
        const d = new Date(lastDay.date);
        d.setDate(d.getDate() + 1);
        nextDate = d.toISOString().slice(0, 10);
      } catch {
        nextDate = lastDay.date;
      }
    }
    setDays(prev => [
      ...prev,
      {
        dayNumber: nextNumber,
        date: nextDate,
        startTime: '09:00',
        endTime: '18:00',
        title: `Day ${nextNumber}`
      }
    ]);
  };

  const handleUpdateDay = (index: number, field: keyof EventDay, val: any) => {
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [field]: val } : d));
  };

  const handleRemoveDay = (index: number) => {
    if (days.length <= 1) return;
    setDays(prev =>
      prev
        .filter((_, i) => i !== index)
        .map((d, idx) => ({ ...d, dayNumber: idx + 1 }))
    );
  };

  const handleSetNumberOfDays = (targetCount: number) => {
    const clamped = Math.max(1, Math.min(14, targetCount));
    if (clamped <= 1) {
      setMultiDayActive(false);
      return;
    }
    setMultiDayActive(true);
    setDays(prev => {
      const baseDate = startDate ? startDate.slice(0, 10) : '';
      const newDays: EventDay[] = [];
      for (let i = 0; i < clamped; i++) {
        const dayNum = i + 1;
        if (prev[i]) {
          newDays.push({ ...prev[i], dayNumber: dayNum });
        } else {
          let dayDate = baseDate;
          if (newDays[i - 1]?.date) {
            try {
              const d = new Date(newDays[i - 1].date);
              d.setDate(d.getDate() + 1);
              dayDate = d.toISOString().slice(0, 10);
            } catch {
              dayDate = baseDate;
            }
          }
          newDays.push({
            dayNumber: dayNum,
            date: dayDate,
            startTime: '09:00',
            endTime: '18:00',
            title: `Day ${dayNum}`
          });
        }
      }
      return newDays;
    });
  };

  const handleSave = async () => {
    setError('');
    if (multiDayActive) {
      if (days.length < 2) {
        setError('Please configure at least 2 event days for a multi-day event.');
        return;
      }
      for (const d of days) {
        if (!d.date) {
          setError(`Please provide a valid date for Day ${d.dayNumber}.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        isMultiDay: multiDayActive,
        eventDays: multiDayActive ? days : []
      };

      // Also ensure overall startDate and endDate align with configured days
      if (multiDayActive && days.length > 0) {
        if (days[0].date) {
          payload.startDate = `${days[0].date}T${days[0].startTime || '09:00'}:00Z`;
        }
        const lastDay = days[days.length - 1];
        if (lastDay.date) {
          payload.endDate = `${lastDay.date}T${lastDay.endTime || '18:00'}:00Z`;
        }
      }

      const res = await fetch(`/api/events/update/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save multi-day schedule');
      }

      setSuccess(true);
      onSaved(multiDayActive, multiDayActive ? days : []);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Error updating schedule');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-2xl bg-[#140608] border border-[var(--gold)]/40 rounded-xl shadow-2xl p-6 md:p-8 my-8 text-[var(--fg)]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[var(--gold)] font-mono text-xs uppercase tracking-widest font-bold">
                  ✦ Event Schedule Settings
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-[family-name:var(--font-marcellus)] font-bold text-white uppercase tracking-wide">
                Multi-Day Schedule & QR Passes
              </h2>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                Event: <strong className="text-white">{eventTitle}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="my-6">
            <label className="block text-xs font-bold text-[var(--gold)] mb-2 uppercase tracking-wider">
              Event Duration Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMultiDayActive(false)}
                className={`p-3.5 rounded-lg border font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !multiDayActive
                    ? 'bg-[var(--gold)] text-black border-[var(--gold)] shadow-lg'
                    : 'bg-[#1a080b] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-white hover:border-[var(--gold)]/40'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Single Day Event
              </button>
              <button
                type="button"
                onClick={() => {
                  setMultiDayActive(true);
                  if (days.length === 0) {
                    handleAddDay();
                  }
                }}
                className={`p-3.5 rounded-lg border font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  multiDayActive
                    ? 'bg-[var(--gold)] text-black border-[var(--gold)] shadow-lg'
                    : 'bg-[#1a080b] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-white hover:border-[var(--gold)]/40'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                ✦ Multiple Days (Day-Specific QRs)
              </button>
            </div>

            {/* Number of Days Input */}
            <div className="mt-3 p-3 bg-[#19070a] border border-[var(--border-subtle)] rounded-lg flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Number of Days of the Event *
                </label>
                <p className="text-[11px] text-[var(--fg-muted)]">
                  Enter total event duration in days (e.g. 2 for 2 days).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={multiDayActive ? days.length : 1}
                  onChange={(e) => {
                    const count = parseInt(e.target.value) || 1;
                    handleSetNumberOfDays(count);
                  }}
                  className="w-20 px-3 py-1.5 bg-[#120406] border border-[var(--gold)]/50 rounded text-center text-sm font-bold text-white focus:outline-none focus:border-[var(--gold)]"
                />
                <span className="text-xs font-bold text-[var(--gold)] uppercase tracking-wider">
                  {multiDayActive ? `${days.length} Days` : '1 Day'}
                </span>
              </div>
            </div>
          </div>

          {/* Multi-Day Days Configuration */}
          {multiDayActive ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                    Configured Days ({days.length})
                  </h4>
                  <p className="text-[11px] text-[var(--fg-muted)]">
                    Each participant will automatically receive a separate QR pass for each configured day.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddDay}
                  className="px-3 py-1.5 bg-[var(--gold)] text-black rounded text-xs font-bold uppercase tracking-wider hover:bg-[var(--gold)]/90 transition-all cursor-pointer flex items-center gap-1 shadow"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Day
                </button>
              </div>

              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {days.map((day, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#1b080d] border border-[var(--border-subtle)] rounded-lg space-y-3 relative group hover:border-[var(--gold)]/40 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-[var(--gold)] text-[10px] font-bold rounded uppercase tracking-wider">
                          Day {day.dayNumber}
                        </span>
                        <input
                          type="text"
                          value={day.title || `Day ${day.dayNumber}`}
                          onChange={(e) => handleUpdateDay(idx, 'title', e.target.value)}
                          placeholder="e.g. Keynotes, Workshops"
                          className="px-2 py-1 bg-[#120406] border border-transparent focus:border-[var(--gold)]/50 rounded text-xs text-white"
                        />
                      </div>
                      {days.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDay(idx)}
                          className="text-red-400 hover:text-red-300 p-1 cursor-pointer transition-colors"
                          title="Remove Day"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                          Date *
                        </label>
                        <input
                          type="date"
                          value={day.date || ''}
                          onChange={(e) => handleUpdateDay(idx, 'date', e.target.value)}
                          className="w-full px-3 py-2 bg-[#120406] border border-[var(--border-subtle)] rounded text-white focus:border-[var(--gold)] focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--gold)]" /> Start Time
                        </label>
                        <input
                          type="time"
                          value={day.startTime || '09:00'}
                          onChange={(e) => handleUpdateDay(idx, 'startTime', e.target.value)}
                          className="w-full px-3 py-2 bg-[#120406] border border-[var(--border-subtle)] rounded text-white focus:border-[var(--gold)] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--gold)]" /> End Time
                        </label>
                        <input
                          type="time"
                          value={day.endTime || '18:00'}
                          onChange={(e) => handleUpdateDay(idx, 'endTime', e.target.value)}
                          className="w-full px-3 py-2 bg-[#120406] border border-[var(--border-subtle)] rounded text-white focus:border-[var(--gold)] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#180609] border border-[var(--border-subtle)] rounded-lg text-center py-6 text-xs text-[var(--fg-muted)]">
              <p>This event is set to a single day. All participants will receive 1 master QR ticket pass.</p>
              <p className="mt-1 text-[var(--gold)]">
                Click <strong>"✦ Multiple Days (Day-Specific QRs)"</strong> above to enable 2-day or multi-day passes.
              </p>
            </div>
          )}

          {/* Feedback messages */}
          {error && (
            <p className="mt-4 text-xs text-red-400 bg-red-950/40 border border-red-800/50 p-2.5 rounded">
              {error}
            </p>
          )}

          {success && (
            <p className="mt-4 text-xs text-green-400 bg-green-950/40 border border-green-800/50 p-2.5 rounded flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Event schedule updated successfully!
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-white rounded text-xs uppercase tracking-wider font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-gradient-to-r from-[var(--primary)] to-[var(--gold)] text-white font-bold text-xs uppercase tracking-wider rounded shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {saving ? 'Saving Schedule...' : 'Save Schedule'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
