'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, X } from 'lucide-react';

interface SuccessNotificationProps {
  open: boolean;
  message: string;
  title?: string;
  onClose: () => void;
  /** Auto-dismiss after this many ms. Pass 0 to disable auto-close. */
  autoCloseMs?: number;
}

/**
 * A clean, centered green success popup - used in place of window.alert()
 * for "your submission succeeded" style confirmations across the app.
 */
export function SuccessNotification({
  open,
  message,
  title = 'Success!',
  onClose,
  autoCloseMs = 4000,
}: SuccessNotificationProps) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const timer = setTimeout(onClose, autoCloseMs);
    return () => clearTimeout(timer);
  }, [open, autoCloseMs, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 320 }}
            role="status"
            aria-live="polite"
            className="relative z-10 w-full max-w-sm rounded-2xl border-2 border-green-500 bg-white p-7 text-center shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-green-700">{title}</h3>
            <p className="text-sm leading-relaxed text-gray-600">{message}</p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
