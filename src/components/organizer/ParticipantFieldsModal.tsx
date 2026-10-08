'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Check,
  SlidersHorizontal,
  AlertCircle
} from 'lucide-react';
import {
  EventRegistrationFields,
  DynamicRegistrationField,
  getEffectiveRegistrationFields
} from '@/types/event';
import { Spinner } from '@/components/ui/spinner';
import RegistrationFieldsEditor from './RegistrationFieldsEditor';

interface ParticipantFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  initialFields?: EventRegistrationFields;
  onSaved?: (newFields: EventRegistrationFields) => void;
}

export default function ParticipantFieldsModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  initialFields,
  onSaved
}: ParticipantFieldsModalProps) {
  // Initialize dynamic fields from initialFields using helper
  const [fields, setFields] = useState<DynamicRegistrationField[]>(() =>
    getEffectiveRegistrationFields(initialFields)
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFields(getEffectiveRegistrationFields(initialFields));
      setErrorMessage(null);
      setSaveSuccess(false);
    }
  }, [isOpen, initialFields, eventId]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      // Build backward-compatible structure alongside full dynamic fields
      const updatedRegistrationFields: EventRegistrationFields = {
        presets: initialFields?.presets || [],
        customFields: initialFields?.customFields || [],
        fields
      };

      const payload = {
        registrationFields: updatedRegistrationFields
      };

      const res = await fetch(`/api/events/update/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save form fields');
      }

      setSaveSuccess(true);
      if (onSaved) {
        onSaved(updatedRegistrationFields);
      }

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error saving registration fields');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" data-lenis-prevent>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col relative overflow-hidden font-[family-name:var(--font-josefin)] rounded-lg"
        >
          {/* Gold Art Deco Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--gold)] z-10" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--gold)] z-10" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--gold)] z-10" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--gold)] z-10" />

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg)]/50 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[var(--gold)]" />
                <h2 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                  Registration Fields & Ticket Customization
                </h2>
              </div>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                Configure participant registration questions for <span className="text-[var(--gold)] font-bold">{eventTitle}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border-subtle)] hover:border-[var(--gold)] rounded transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded flex items-center gap-2 text-red-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Body Content */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <RegistrationFieldsEditor
              fields={fields}
              onChange={setFields}
              showPreviewToggle={true}
            />
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg)]/70 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border-subtle)] rounded transition-colors font-bold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className={`px-6 py-2.5 rounded text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black shadow-lg shadow-[var(--gold)]/20'
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <Spinner inline /> Saving Fields...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Changes Saved!
                </>
              ) : (
                'Save Form Fields'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
