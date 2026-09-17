'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Sparkles
} from 'lucide-react';

interface VirtualDateTimePickerProps {
  label: string;
  value?: string; // ISO string e.g. "2026-10-24T18:30:00Z" or "2026-10-24T18:30"
  onChange: (isoString: string) => void;
  required?: boolean;
  minDate?: string;
  placeholder?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function VirtualDateTimePicker({
  label,
  value,
  onChange,
  required = false,
  minDate,
  placeholder = 'Select date & time'
}: VirtualDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'clock'>('calendar');
  const [clockMode, setClockMode] = useState<'hours' | 'minutes'>('hours');

  // Parse initial value or fallback to tomorrow at 10:00 AM
  const parsedDate = useMemo(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d;
  }, [value]);

  // Working state while dialog is open
  const [currentYear, setCurrentYear] = useState(parsedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(parsedDate.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsedDate.getDate());

  // Time state (12-hour format)
  const initialHours24 = parsedDate.getHours();
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initialHours24 >= 12 ? 'PM' : 'AM');
  const [selectedHour12, setSelectedHour12] = useState(() => {
    const h = initialHours24 % 12;
    return h === 0 ? 12 : h;
  });
  const [selectedMinute, setSelectedMinute] = useState(parsedDate.getMinutes());

  // Synchronize internal state when value prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentYear(parsedDate.getFullYear());
      setCurrentMonth(parsedDate.getMonth());
      setSelectedDay(parsedDate.getDate());
      const h24 = parsedDate.getHours();
      setSelectedPeriod(h24 >= 12 ? 'PM' : 'AM');
      const h12 = h24 % 12;
      setSelectedHour12(h12 === 0 ? 12 : h12);
      setSelectedMinute(parsedDate.getMinutes());
    }
  }, [isOpen, parsedDate]);

  // Days in month calculation
  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayOfWeek = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Quick Date presets
  const setQuickDate = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() + offsetDays);
    setCurrentYear(target.getFullYear());
    setCurrentMonth(target.getMonth());
    setSelectedDay(target.getDate());
  };

  // Convert 12h to 24h
  const getHours24 = () => {
    if (selectedPeriod === 'AM') {
      return selectedHour12 === 12 ? 0 : selectedHour12;
    } else {
      return selectedHour12 === 12 ? 12 : selectedHour12 + 12;
    }
  };

  // Save selection
  const handleConfirm = () => {
    const validDay = Math.min(selectedDay, daysInMonth);
    const h24 = getHours24();

    // Construct local Date and output ISO string
    const finalDate = new Date(currentYear, currentMonth, validDay, h24, selectedMinute, 0);
    const isoString = finalDate.toISOString();
    onChange(isoString);
    setIsOpen(false);
  };

  // Display strings for trigger
  const displayString = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;

    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const timeStr = d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return { dateStr, timeStr };
  }, [value]);

  // Clock calculations for visual dial
  const clockCenter = 100;
  const clockRadius = 72;

  const hoursList = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  // Current hand angle
  const handAngle = clockMode === 'hours'
    ? (selectedHour12 % 12) * 30
    : selectedMinute * 6;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="deco-label m-0">{label}</label>
        {value && (
          <span className="text-[10px] text-[var(--gold)] font-mono uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--gold)]" /> Verified Time
          </span>
        )}
      </div>

      {/* Trigger Box */}
      <div
        onClick={() => setIsOpen(true)}
        className="cursor-pointer group relative flex items-center justify-between p-3.5 bg-[var(--bg-card)] border-2 border-[var(--border-subtle)] hover:border-yellow-400/80 rounded-xl transition-all shadow-sm"
      >
        {displayString ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-950/60 border border-yellow-400/40 text-yellow-300 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-yellow-300 transition-colors">
                {displayString.dateStr}
              </div>
              <div className="text-xs text-[var(--fg-muted)] flex items-center gap-1.5 mt-0.5">
                <ClockIcon className="w-3.5 h-3.5 text-yellow-400" />
                <span className="font-semibold text-yellow-400">{displayString.timeStr}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[var(--fg-muted)]">
            <div className="w-10 h-10 rounded-lg bg-red-950/30 border border-[var(--border-subtle)] flex items-center justify-center">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <span className="text-sm">{placeholder}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-red-900/40 text-yellow-300 border border-yellow-400/30 group-hover:bg-red-900/80 group-hover:border-yellow-400 transition-all">
            Pick Date & Time
          </span>
        </div>
      </div>

      {/* Popup Modal for Virtual Calendar & Clock */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4" data-lenis-prevent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-gradient-to-br from-[#1d0307] via-[#120205] to-[#1a0307] border-2 border-yellow-400/80 rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(220,38,38,0.45)] overflow-hidden text-white font-[family-name:var(--font-josefin)]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-yellow-400/20 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-900/50 border border-yellow-400/40 flex items-center justify-center text-yellow-400">
                    <CalendarIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                      Virtual Calendar & Clock
                    </h3>
                    <p className="text-[11px] text-yellow-300/80">
                      Configure precise date and time for {label.toLowerCase()}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-red-950/60 border border-yellow-400/30 text-yellow-400 hover:text-white hover:border-yellow-400 flex items-center justify-center transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Tab Switcher */}
              <div className="md:hidden flex border-b border-yellow-400/20 bg-black/30">
                <button
                  type="button"
                  onClick={() => setActiveTab('calendar')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                    activeTab === 'calendar'
                      ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <CalendarIcon className="w-3.5 h-3.5" /> Virtual Calendar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('clock')}
                  className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-all ${
                    activeTab === 'clock'
                      ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  <ClockIcon className="w-3.5 h-3.5" /> Virtual Clock
                </button>
              </div>

              {/* Main Body: Two Columns on Desktop */}
              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[75vh] overflow-y-auto">
                {/* COLUMN 1: Virtual Calendar */}
                <div className={`${activeTab === 'calendar' ? 'block' : 'hidden md:block'} space-y-4`}>
                  <div className="flex items-center justify-between pb-2 border-b border-yellow-400/20">
                    <span className="text-xs font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" /> Virtual Calendar
                    </span>

                    {/* Quick presets */}
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setQuickDate(0)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(1)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(7)}
                        className="px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 hover:bg-yellow-400/20"
                      >
                        +7 Days
                      </button>
                    </div>
                  </div>

                  {/* Month Navigation */}
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-yellow-400/20">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      className="p-1 rounded-lg hover:bg-yellow-400/20 text-yellow-400 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center font-bold text-sm text-yellow-300 font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                      {MONTH_NAMES[currentMonth]} {currentYear}
                    </div>

                    <button
                      type="button"
                      onClick={handleNextMonth}
                      className="p-1 rounded-lg hover:bg-yellow-400/20 text-yellow-400 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Day of Week Headers */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {DAYS_OF_WEEK.map(day => (
                      <div key={day} className="text-[10px] font-bold text-yellow-400/70 uppercase py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {/* Empty leading cells */}
                    {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="h-8 w-8" />
                    ))}

                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const isSelected = dayNum === selectedDay;
                      const isToday =
                        dayNum === new Date().getDate() &&
                        currentMonth === new Date().getMonth() &&
                        currentYear === new Date().getFullYear();

                      return (
                        <button
                          key={`day-${dayNum}`}
                          type="button"
                          onClick={() => setSelectedDay(dayNum)}
                          className={`h-8 w-8 mx-auto rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-gradient-to-b from-red-600 to-red-800 text-yellow-300 border-2 border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.5)] scale-110'
                              : isToday
                              ? 'border border-yellow-400/60 text-yellow-400 hover:bg-yellow-400/15'
                              : 'text-gray-200 hover:bg-red-950/50 hover:text-white'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* COLUMN 2: Virtual Clock */}
                <div className={`${activeTab === 'clock' ? 'block' : 'hidden md:block'} space-y-4 md:border-l md:border-yellow-400/20 md:pl-6`}>
                  <div className="flex items-center justify-between pb-2 border-b border-yellow-400/20">
                    <span className="text-xs font-bold uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
                      <ClockIcon className="w-3.5 h-3.5" /> Virtual Clock
                    </span>

                    {/* AM / PM Toggle Buttons */}
                    <div className="flex p-0.5 bg-black/60 rounded-lg border border-yellow-400/30">
                      <button
                        type="button"
                        onClick={() => setSelectedPeriod('AM')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          selectedPeriod === 'AM'
                            ? 'bg-red-700 text-yellow-300 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPeriod('PM')}
                        className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                          selectedPeriod === 'PM'
                            ? 'bg-red-700 text-yellow-300 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>

                  {/* Digital Readout with Mode Switcher */}
                  <div className="flex items-center justify-center gap-2 bg-black/40 py-2.5 px-4 rounded-xl border border-yellow-400/30">
                    <button
                      type="button"
                      onClick={() => setClockMode('hours')}
                      className={`px-3 py-1.5 rounded-lg text-lg font-mono font-bold transition-all ${
                        clockMode === 'hours'
                          ? 'bg-red-700 text-yellow-300 border border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                          : 'bg-red-950/40 text-gray-300 hover:text-white'
                      }`}
                      title="Click to set hour"
                    >
                      {String(selectedHour12).padStart(2, '0')}
                    </button>

                    <span className="text-xl font-mono font-bold text-yellow-400 animate-pulse">:</span>

                    <button
                      type="button"
                      onClick={() => setClockMode('minutes')}
                      className={`px-3 py-1.5 rounded-lg text-lg font-mono font-bold transition-all ${
                        clockMode === 'minutes'
                          ? 'bg-red-700 text-yellow-300 border border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                          : 'bg-red-950/40 text-gray-300 hover:text-white'
                      }`}
                      title="Click to set minutes"
                    >
                      {String(selectedMinute).padStart(2, '0')}
                    </button>

                    <span className="text-sm font-bold text-yellow-400 ml-1">
                      {selectedPeriod}
                    </span>
                  </div>

                  {/* Virtual Analog Clock Face Dial */}
                  <div className="relative w-52 h-52 mx-auto rounded-full bg-gradient-to-br from-[#260308] to-[#0f0103] border-2 border-yellow-400/60 shadow-inner flex items-center justify-center select-none">
                    {/* Center Pivot */}
                    <div className="absolute w-3 h-3 rounded-full bg-yellow-400 z-20 shadow-[0_0_8px_#facc15]" />

                    {/* Clock Hand Line */}
                    <div
                      className="absolute z-10 origin-bottom pointer-events-none"
                      style={{
                        height: `${clockRadius - 10}px`,
                        width: '3px',
                        background: 'linear-gradient(to top, #facc15, #dc2626)',
                        bottom: `${clockCenter}px`,
                        left: `calc(50% - 1.5px)`,
                        transform: `rotate(${handAngle}deg)`
                      }}
                    >
                      <div className="w-3 h-3 -ml-[4.5px] -mt-1.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
                    </div>

                    {/* Numbers around the face */}
                    {clockMode === 'hours' ? (
                      hoursList.map(h => {
                        const angle = (h * 30 - 90) * (Math.PI / 180);
                        const x = clockCenter + clockRadius * Math.cos(angle);
                        const y = clockCenter + clockRadius * Math.sin(angle);
                        const isSelected = h === selectedHour12;

                        return (
                          <button
                            key={`h-${h}`}
                            type="button"
                            onClick={() => {
                              setSelectedHour12(h);
                              // Auto switch to minutes after picking hour for seamless UX
                              setClockMode('minutes');
                            }}
                            className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full text-xs font-bold flex items-center justify-center transition-transform z-15 ${
                              isSelected
                                ? 'bg-yellow-400 text-red-950 shadow-[0_0_10px_#facc15] font-extrabold scale-110'
                                : 'text-gray-200 hover:text-yellow-300 hover:scale-125'
                            }`}
                            style={{ left: `${x}px`, top: `${y}px` }}
                          >
                            {h}
                          </button>
                        );
                      })
                    ) : (
                      minutesList.map(m => {
                        const angle = (m * 6 - 90) * (Math.PI / 180);
                        const x = clockCenter + clockRadius * Math.cos(angle);
                        const y = clockCenter + clockRadius * Math.sin(angle);
                        const isSelected = m === selectedMinute;

                        return (
                          <button
                            key={`m-${m}`}
                            type="button"
                            onClick={() => setSelectedMinute(m)}
                            className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 rounded-full text-[10px] font-bold flex items-center justify-center transition-transform z-15 ${
                              isSelected
                                ? 'bg-yellow-400 text-red-950 shadow-[0_0_10px_#facc15] font-extrabold scale-110'
                                : 'text-gray-200 hover:text-yellow-300 hover:scale-125'
                            }`}
                            style={{ left: `${x}px`, top: `${y}px` }}
                          >
                            {String(m).padStart(2, '0')}
                          </button>
                        );
                      })
                    )}
                  </div>

                  {/* Quick Time Presets */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {[
                      { label: '9 AM', h: 9, p: 'AM' },
                      { label: '2 PM', h: 2, p: 'PM' },
                      { label: '6 PM', h: 6, p: 'PM' },
                      { label: '8 PM', h: 8, p: 'PM' }
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setSelectedHour12(preset.h);
                          setSelectedMinute(0);
                          setSelectedPeriod(preset.p as 'AM' | 'PM');
                        }}
                        className="py-1 px-1 rounded bg-yellow-400/10 border border-yellow-400/25 text-[10px] font-bold text-yellow-300 hover:bg-yellow-400/20 text-center"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Preview & Actions */}
              <div className="p-4 sm:p-5 border-t border-yellow-400/20 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-center sm:text-left">
                  <span className="text-[10px] text-yellow-400/80 uppercase tracking-widest block font-bold">
                    Target Selection Preview:
                  </span>
                  <span className="font-bold text-white text-sm">
                    {MONTH_NAMES[currentMonth].slice(0, 3)} {selectedDay}, {currentYear} •{' '}
                    <span className="text-yellow-400">
                      {String(selectedHour12).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}{' '}
                      {selectedPeriod}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-red-600 to-red-800 text-yellow-300 border-2 border-yellow-400 rounded-lg text-xs font-bold uppercase tracking-wider hover:shadow-[0_0_20px_rgba(250,204,21,0.5)] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Confirm
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
