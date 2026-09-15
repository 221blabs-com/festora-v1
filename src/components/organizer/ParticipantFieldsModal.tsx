'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Trash2,
  Check,
  ListPlus,
  SlidersHorizontal,
  FileQuestion,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import {
  PresetFieldConfig,
  CustomFieldConfig,
  EventRegistrationFields
} from '@/types/event';
import { Spinner } from '@/components/ui/spinner';

interface ParticipantFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  initialFields?: EventRegistrationFields;
  onSaved?: (newFields: EventRegistrationFields) => void;
}

const DEFAULT_PRESETS: PresetFieldConfig[] = [
  { key: 'rollNumber', label: 'Roll Number / Student ID', enabled: true, required: true },
  { key: 'college', label: 'College / University', enabled: true, required: true },
  { key: 'department', label: 'Department / Branch', enabled: true, required: true },
  { key: 'year', label: 'Year of Study', enabled: true, required: true },
  { key: 'gender', label: 'Gender', enabled: false, required: false },
  { key: 'tshirtSize', label: 'T-Shirt Size', enabled: false, required: false }
];

export default function ParticipantFieldsModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  initialFields,
  onSaved
}: ParticipantFieldsModalProps) {
  // Merge initial presets with defaults to ensure all keys exist
  const [presets, setPresets] = useState<PresetFieldConfig[]>(() => {
    if (!initialFields?.presets || initialFields.presets.length === 0) {
      return DEFAULT_PRESETS;
    }
    return DEFAULT_PRESETS.map(def => {
      const existing = initialFields.presets?.find(p => p.key === def.key);
      return existing || def;
    });
  });

  const [customFields, setCustomFields] = useState<CustomFieldConfig[]>(
    initialFields?.customFields || []
  );

  // New custom field form state
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<'text' | 'number' | 'select' | 'textarea'>('text');
  const [newOptions, setNewOptions] = useState('');
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const togglePresetEnabled = (key: string) => {
    setPresets(prev =>
      prev.map(p => {
        if (p.key === key) {
          const nextEnabled = !p.enabled;
          return {
            ...p,
            enabled: nextEnabled,
            // If disabled, required should also be false
            required: nextEnabled ? p.required : false
          };
        }
        return p;
      })
    );
  };

  const togglePresetRequired = (key: string) => {
    setPresets(prev =>
      prev.map(p => (p.key === key ? { ...p, required: !p.required } : p))
    );
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const id = `field_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const parsedOptions =
      newType === 'select'
        ? newOptions
            .split(',')
            .map(opt => opt.trim())
            .filter(Boolean)
        : undefined;

    const newField: CustomFieldConfig = {
      id,
      label: newLabel.trim(),
      type: newType,
      options: parsedOptions,
      required: newRequired,
      placeholder: newPlaceholder.trim() || undefined
    };

    setCustomFields(prev => [...prev, newField]);

    // Reset form
    setNewLabel('');
    setNewType('text');
    setNewOptions('');
    setNewRequired(false);
    setNewPlaceholder('');
  };

  const handleDeleteCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload = {
        registrationFields: {
          presets,
          customFields
        }
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
        onSaved({ presets, customFields });
      }

      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error saving registration fields');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" data-lenis-prevent>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col relative overflow-hidden font-[family-name:var(--font-josefin)]"
        >
          {/* Gold Art Deco Corner accents */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--gold)] z-10" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--gold)] z-10" />
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--gold)] z-10" />
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--gold)] z-10" />

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)] bg-[var(--bg)]/40">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-[var(--gold)]" />
                <h2 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                  Participant Data Fields
                </h2>
              </div>
              <p className="text-xs text-[var(--fg-muted)] mt-1">
                Configure what attendee information to collect for <span className="text-[var(--gold)]">{eventTitle}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border-subtle)] hover:border-[var(--gold)] rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 overflow-y-auto space-y-8 flex-1">
            {errorMessage && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* SECTION 1: Preset Fields */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-widest text-[var(--gold)] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Preset Participant Fields
                </h3>
                <span className="text-[11px] text-[var(--fg-muted)]">
                  Standard college & attendee fields
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {presets.map(field => (
                  <div
                    key={field.key}
                    className={`p-3 border transition-all rounded ${
                      field.enabled
                        ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5'
                        : 'border-[var(--border-subtle)] bg-[var(--bg)] opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={field.enabled}
                          onChange={() => togglePresetEnabled(field.key)}
                          className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-[var(--fg)]">
                          {field.label}
                        </span>
                      </label>

                      {field.enabled && (
                        <label className="flex items-center gap-1.5 text-[10px] text-[var(--fg-muted)] cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={() => togglePresetRequired(field.key)}
                            className="w-3.5 h-3.5 accent-[var(--gold)] cursor-pointer"
                          />
                          <span>Required</span>
                        </label>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: Custom Fields */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-widest text-[var(--gold)] font-bold flex items-center gap-1.5">
                  <FileQuestion className="w-3.5 h-3.5" /> Custom Questions & Fields
                </h3>
                <span className="text-[11px] text-[var(--fg-muted)]">
                  {customFields.length} custom field{customFields.length !== 1 ? 's' : ''} added
                </span>
              </div>

              {/* List of custom fields */}
              {customFields.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {customFields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded hover:border-[var(--gold)]/40 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[var(--fg)]">
                            {idx + 1}. {field.label}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 border border-[var(--border-subtle)] text-[var(--fg-muted)] uppercase tracking-wider rounded">
                            {field.type}
                          </span>
                          {field.required && (
                            <span className="text-[10px] text-[var(--primary)] font-bold uppercase tracking-wider">
                              *Required
                            </span>
                          )}
                        </div>
                        {field.type === 'select' && field.options && (
                          <p className="text-[11px] text-[var(--fg-muted)]">
                            Options: {field.options.join(', ')}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCustomField(field.id)}
                        className="p-1.5 text-[var(--fg-muted)] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="Delete field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 px-3 border border-dashed border-[var(--border-subtle)] text-[var(--fg-muted)] text-xs mb-4 rounded">
                  No custom questions added yet. Use the form below to add questions like GitHub URL, dietary requirements, or workshop choices.
                </div>
              )}

              {/* Add Custom Field Form */}
              <div className="p-4 bg-[var(--bg)]/70 border border-[var(--border-subtle)] rounded-lg space-y-3">
                <p className="text-xs font-bold text-[var(--fg)] uppercase tracking-wider flex items-center gap-1.5">
                  <ListPlus className="w-3.5 h-3.5 text-[var(--gold)]" /> Add New Custom Question
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                      Question / Field Label *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. GitHub Profile URL or Dietary Restrictions"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--gold)] rounded"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                      Field Type
                    </label>
                    <select
                      value={newType}
                      onChange={e => setNewType(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--fg)] focus:outline-none focus:border-[var(--gold)] rounded"
                    >
                      <option value="text">Single-line Text</option>
                      <option value="number">Number</option>
                      <option value="select">Dropdown Select</option>
                      <option value="textarea">Multi-line Text (Textarea)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                      Placeholder Text (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://github.com/..."
                      value={newPlaceholder}
                      onChange={e => setNewPlaceholder(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--gold)] rounded"
                    />
                  </div>

                  {newType === 'select' && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[10px] font-bold text-[var(--fg-muted)] uppercase tracking-wider">
                        Dropdown Options (comma-separated) *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Vegetarian, Non-Vegetarian, Vegan"
                        value={newOptions}
                        onChange={e => setNewOptions(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--fg)] placeholder-[var(--fg-muted)] focus:outline-none focus:border-[var(--gold)] rounded"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newRequired}
                      onChange={e => setNewRequired(e.target.checked)}
                      className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
                    />
                    <span className="text-xs text-[var(--fg-muted)]">
                      Required for participant to answer
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    disabled={!newLabel.trim() || (newType === 'select' && !newOptions.trim())}
                    className="px-4 py-1.5 bg-[var(--primary)]/20 hover:bg-[var(--primary)] text-[var(--primary)] hover:text-white border border-[var(--primary)]/40 rounded text-xs uppercase tracking-wider font-bold transition-all disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Field
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg)]/60 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs uppercase tracking-wider text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--border-subtle)] rounded transition-colors font-bold"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || saveSuccess}
              className={`px-6 py-2 rounded text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-all ${
                saveSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-lg shadow-[var(--primary)]/20'
              } disabled:opacity-50`}
            >
              {saving ? (
                <>
                  <Spinner inline /> Saving Fields...
                </>
              ) : saveSuccess ? (
                <>
                  <Check className="w-4 h-4" /> Saved Successfully!
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
