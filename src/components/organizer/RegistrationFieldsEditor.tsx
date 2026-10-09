'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  SlidersHorizontal,
  Ticket,
  AlertCircle,
  Sparkles,
  X
} from 'lucide-react';
import {
  DynamicRegistrationField,
  DynamicFieldType,
  REGISTRATION_FIELD_TEMPLATES,
  RegistrationFieldTemplate
} from '@/types/event';

interface RegistrationFieldsEditorProps {
  fields: DynamicRegistrationField[];
  onChange: (fields: DynamicRegistrationField[]) => void;
  showPreviewToggle?: boolean;
}

let idCounter = 0;
function generateFieldId(prefix: string): string {
  idCounter += 1;
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `field_${cleanPrefix}_${idCounter}`;
}

const FIELD_TYPE_LABELS: Record<DynamicFieldType, string> = {
  text: 'Text',
  number: 'Number',
  dropdown: 'Dropdown',
  checkbox: 'Checkbox',
  radio: 'Radio',
  date: 'Date',
  dynamic_qr: 'QR Code (Dynamic QR)',
  qr_code: 'QR Code',
  email: 'Email Address',
  phone: 'Phone Number',
  textarea: 'Textarea (Multi-line)'
};

const FIELD_TYPE_COLORS: Record<DynamicFieldType, string> = {
  text: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  number: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  dropdown: 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/30',
  checkbox: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  radio: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  date: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  dynamic_qr: 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/40 shadow-sm font-bold',
  qr_code: 'bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/40 shadow-sm font-bold',
  email: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  phone: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  textarea: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
};

export default function RegistrationFieldsEditor({
  fields,
  onChange,
  showPreviewToggle = true
}: RegistrationFieldsEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  // New field custom addition form state
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customType, setCustomType] = useState<DynamicFieldType>('text');
  const [customRequired, setCustomRequired] = useState(false);
  const [customShowOnTicket, setCustomShowOnTicket] = useState(true);
  const [customOptionsInput, setCustomOptionsInput] = useState('');
  const [customPlaceholder, setCustomPlaceholder] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  // Dynamic QR Specific State
  const [qrCodeName, setQrCodeName] = useState('');
  const [qrDescription, setQrDescription] = useState('');
  const [qrValidDay, setQrValidDay] = useState<number | 'all'>('all');
  const [autoGenerateNew, setAutoGenerateNew] = useState(true);
  const [generateForExisting, setGenerateForExisting] = useState(false);

  // Quick add from template
  const handleAddTemplate = (template: RegistrationFieldTemplate) => {
    // Generate clean id
    const id = generateFieldId(template.key);
    const newField: DynamicRegistrationField = {
      id,
      label: template.label,
      type: template.type,
      field_type: template.type,
      required: template.required,
      showOnTicket: template.showOnTicket,
      show_on_ticket: template.showOnTicket,
      options: template.options ? [...template.options] : undefined,
      placeholder: template.placeholder,
      displayOrder: fields.length + 1,
      display_order: fields.length + 1
    };

    const updated = [...fields, newField];
    onChange(resequenceOrders(updated));
  };

  // Re-sequence display orders 1..N
  const resequenceOrders = (list: DynamicRegistrationField[]): DynamicRegistrationField[] => {
    return list.map((item, idx) => ({
      ...item,
      displayOrder: idx + 1,
      display_order: idx + 1
    }));
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const copy = [...fields];
    const temp = copy[index - 1];
    copy[index - 1] = copy[index];
    copy[index] = temp;
    onChange(resequenceOrders(copy));
  };

  const handleMoveDown = (index: number) => {
    if (index >= fields.length - 1) return;
    const copy = [...fields];
    const temp = copy[index + 1];
    copy[index + 1] = copy[index];
    copy[index] = temp;
    onChange(resequenceOrders(copy));
  };

  const handleDelete = (id: string) => {
    const filtered = fields.filter((f) => f.id !== id);
    onChange(resequenceOrders(filtered));
  };

  const handleToggleRequired = (id: string) => {
    const updated = fields.map((f) =>
      f.id === id ? { ...f, required: !f.required } : f
    );
    onChange(updated);
  };

  const handleToggleShowOnTicket = (id: string) => {
    const updated = fields.map((f) => {
      if (f.id === id) {
        const nextVal = !f.showOnTicket;
        return {
          ...f,
          showOnTicket: nextVal,
          show_on_ticket: nextVal
        };
      }
      return f;
    });
    onChange(updated);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customLabel.trim()) return;

    const needsOptions = customType === 'dropdown' || customType === 'radio' || customType === 'checkbox';
    const parsedOptions = needsOptions
      ? customOptionsInput
          .split(',')
          .map((opt) => opt.trim())
          .filter(Boolean)
      : undefined;

    const isDynamicQr = customType === 'dynamic_qr' || customType === 'qr_code';

    const newField: DynamicRegistrationField = {
      id: generateFieldId(isDynamicQr ? `qr_${customLabel.trim()}` : `custom_${customLabel.trim()}`),
      label: customLabel.trim(),
      type: customType,
      field_type: customType,
      required: isDynamicQr ? false : customRequired,
      showOnTicket: isDynamicQr ? true : customShowOnTicket,
      show_on_ticket: isDynamicQr ? true : customShowOnTicket,
      options: parsedOptions,
      placeholder: isDynamicQr ? undefined : (customPlaceholder.trim() || undefined),
      qrCodeName: isDynamicQr ? (qrCodeName.trim() || customLabel.trim()) : undefined,
      qrDescription: isDynamicQr ? (qrDescription.trim() || undefined) : undefined,
      validDayNumber: isDynamicQr ? qrValidDay : undefined,
      autoGenerateNewRegistrations: isDynamicQr ? autoGenerateNew : undefined,
      enabled: true,
      displayOrder: fields.length + 1,
      display_order: fields.length + 1
    };

    const updated = [...fields, newField];
    onChange(resequenceOrders(updated));

    // Reset
    setCustomLabel('');
    setCustomType('text');
    setCustomRequired(false);
    setCustomShowOnTicket(true);
    setCustomOptionsInput('');
    setCustomPlaceholder('');
    setQrCodeName('');
    setQrDescription('');
    setQrValidDay('all');
    setAutoGenerateNew(true);
    setGenerateForExisting(false);
    setIsAddingCustom(false);
  };

  const handleUpdateField = (id: string, updates: Partial<DynamicRegistrationField>) => {
    const updated = fields.map((f) => {
      if (f.id === id) {
        return {
          ...f,
          ...updates,
          field_type: updates.type || f.type,
          show_on_ticket: updates.showOnTicket !== undefined ? updates.showOnTicket : f.showOnTicket
        };
      }
      return f;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-6 font-[family-name:var(--font-josefin)]">
      {/* Header Bar with Toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[var(--gold)]" />
            <h3 className="text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
              Dynamic Registration Fields
            </h3>
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Configure participant questions. Fields marked <span className="text-[var(--gold)] font-bold">Show on Ticket</span> will automatically print on the attendee&apos;s downloaded pass.
          </p>
        </div>

        {showPreviewToggle && (
          <div className="flex items-center bg-[var(--bg)] p-1 rounded-md border border-[var(--border-subtle)] self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-[var(--gold)] text-black shadow-sm'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              Configure Fields ({fields.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[var(--gold)] text-black shadow-sm'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Live Preview
            </button>
          </div>
        )}
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-6">
          {/* Quick-Add Standard Presets */}
          <div className="p-4 bg-[var(--bg)]/70 border border-[var(--border-subtle)] rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[var(--gold)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">
                Quick-Add Standard Fields
              </span>
              <span className="text-[10px] text-[var(--fg-muted)]">(Click to add instantly)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {REGISTRATION_FIELD_TEMPLATES.map((tmpl) => {
                const alreadyAdded = fields.some(
                  (f) => f.label.toLowerCase() === tmpl.label.toLowerCase()
                );
                return (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => handleAddTemplate(tmpl)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer font-medium ${
                      alreadyAdded
                        ? 'border-[var(--gold)]/40 bg-[var(--gold)]/10 text-[var(--gold)] hover:bg-[var(--gold)]/20'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--gold)]'
                    }`}
                    title={tmpl.description}
                  >
                    <Plus className="w-3 h-3 text-[var(--gold)]" />
                    <span>{tmpl.label}</span>
                    {tmpl.showOnTicket && (
                      <span title="Shows on downloaded ticket">
                        <Ticket className="w-2.5 h-2.5 text-[var(--gold)]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configured Fields List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg-muted)]">
                Current Registration Form Fields ({fields.length})
              </span>
              {!isAddingCustom && (
                <button
                  type="button"
                  onClick={() => setIsAddingCustom(true)}
                  className="text-xs text-[var(--gold)] hover:underline font-bold flex items-center gap-1 cursor-pointer bg-[var(--gold)]/10 px-3 py-1.5 rounded border border-[var(--gold)]/30 hover:bg-[var(--gold)]/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> + Add Dynamic Field
                </button>
              )}
            </div>

            {fields.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bg)]/50 border border-dashed border-[var(--border-subtle)] rounded-lg">
                <AlertCircle className="w-8 h-8 text-[var(--gold)] mx-auto mb-2 opacity-60" />
                <p className="text-sm text-[var(--fg)] font-bold">No registration fields configured</p>
                <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-md mx-auto">
                  Click any standard field above (like Full Name, Email, T-Shirt Size, Food Preference) or add a custom question below.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {fields.map((field, index) => {
                  const isEditing = editingFieldId === field.id;
                  const needsOptions =
                    field.type === 'dropdown' || field.type === 'radio' || field.type === 'checkbox';

                  return (
                    <motion.div
                      key={field.id}
                      layout
                      className={`p-4 bg-[var(--bg-card)] border rounded-lg transition-all ${
                        field.showOnTicket
                          ? 'border-[var(--gold)]/40 hover:border-[var(--gold)]'
                          : 'border-[var(--border-subtle)] hover:border-[var(--fg-muted)]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Left: Reorder + Label + Type */}
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Reordering Controls */}
                          <div className="flex items-center gap-1 text-[var(--fg-muted)]">
                            <button
                              type="button"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0}
                              className="p-1 hover:text-[var(--fg)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[10px] font-mono font-bold w-4 text-center">
                              {field.displayOrder}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === fields.length - 1}
                              className="p-1 hover:text-[var(--fg)] disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Field Label and Type */}
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) =>
                                  handleUpdateField(field.id, { label: e.target.value })
                                }
                                className="w-full px-2 py-1 bg-[var(--bg)] border border-[var(--gold)] rounded text-xs font-bold text-[var(--fg)]"
                              />
                            ) : (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-[var(--fg)] truncate">
                                  {field.label}
                                </span>
                                {field.required && (
                                  <span className="text-red-400 text-xs font-bold" title="Required field">*</span>
                                )}
                                <span
                                  className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border ${
                                    FIELD_TYPE_COLORS[field.type] || 'bg-gray-500/10 text-gray-400'
                                  }`}
                                >
                                  {FIELD_TYPE_LABELS[field.type] || field.type}
                                </span>
                              </div>
                            )}

                            {/* Options preview */}
                            {needsOptions && field.options && field.options.length > 0 && !isEditing && (
                              <p className="text-[11px] text-[var(--fg-muted)] mt-1 truncate">
                                Options: {field.options.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Right: Badges / Toggles / Actions */}
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {/* Required Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleRequired(field.id)}
                            className={`text-[11px] px-2.5 py-1 rounded border font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                              field.required
                                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                                : 'bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                            }`}
                            title="Toggle required vs optional"
                          >
                            {field.required ? 'Required' : 'Optional'}
                          </button>

                          {/* Show on Ticket Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleShowOnTicket(field.id)}
                            className={`text-[11px] px-2.5 py-1 rounded border font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer ${
                              field.showOnTicket
                                ? 'bg-[var(--gold)]/20 border-[var(--gold)] text-[var(--gold)] shadow-sm'
                                : 'bg-[var(--bg)] border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)]'
                            }`}
                            title="When enabled, this field will automatically print on the attendee's ticket"
                          >
                            <Ticket className="w-3 h-3" />
                            {field.showOnTicket ? 'On Ticket: YES' : 'On Ticket: NO'}
                          </button>

                          {/* Edit / Done */}
                          <button
                            type="button"
                            onClick={() => setEditingFieldId(isEditing ? null : field.id)}
                            className="text-[11px] px-2 py-1 text-[var(--fg-muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            {isEditing ? 'Done' : 'Edit'}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(field.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors cursor-pointer"
                            title="Delete field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Extended Inline Editor */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                              Field Type
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) =>
                                handleUpdateField(field.id, {
                                  type: e.target.value as DynamicFieldType
                                })
                              }
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)]"
                            >
                              {(Object.keys(FIELD_TYPE_LABELS) as DynamicFieldType[]).map((t) => (
                                <option key={t} value={t}>
                                  {FIELD_TYPE_LABELS[t]}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                              Placeholder (Optional)
                            </label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={(e) =>
                                handleUpdateField(field.id, { placeholder: e.target.value })
                              }
                              className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)]"
                              placeholder="e.g. Enter details..."
                            />
                          </div>

                          {needsOptions && (
                            <div className="sm:col-span-2">
                              <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                                Options (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={(field.options || []).join(', ')}
                                onChange={(e) =>
                                  handleUpdateField(field.id, {
                                    options: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  })
                                }
                                className="w-full px-2 py-1.5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[var(--fg)]"
                                placeholder="Option 1, Option 2, Option 3"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Custom Question Form */}
          <AnimatePresence>
            {isAddingCustom && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSaveCustom}
                className="p-5 bg-[var(--bg-card)] border border-[var(--gold)]/40 rounded-lg space-y-4 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[var(--gold)]" />
                    <h4 className="text-sm font-bold text-[var(--fg)] uppercase tracking-wider font-[family-name:var(--font-marcellus)]">
                      {(customType === 'dynamic_qr' || customType === 'qr_code') ? 'Configure QR Code (Dynamic QR) Field' : 'New Dynamic Form Field'}
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="text-[var(--fg-muted)] hover:text-[var(--fg)] p-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Field Type Selector Bar */}
                <div className="p-3 bg-[var(--bg)]/80 border border-[var(--border-subtle)] rounded-md">
                  <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1.5">
                    Field Type
                  </label>
                  <select
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value as DynamicFieldType)}
                    className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)] font-medium text-xs"
                  >
                    {(Object.keys(FIELD_TYPE_LABELS) as DynamicFieldType[]).map((t) => (
                      <option key={t} value={t}>
                        {FIELD_TYPE_LABELS[t]} {t === 'dynamic_qr' || t === 'qr_code' ? '✦ (Auto-Generated QR Pass)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {(customType === 'dynamic_qr' || customType === 'qr_code') ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-[var(--gold)]/10 border border-[var(--gold)]/30 rounded text-xs text-[var(--gold)]">
                      <p className="font-bold">✦ DYNAMIC QR COUPON CONFIGURATION</p>
                      <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">
                        The system will automatically generate a unique QR code for every registered participant. No manual QR creation required.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                          QR Field Name: *
                        </label>
                        <input
                          type="text"
                          value={customLabel}
                          onChange={(e) => {
                            setCustomLabel(e.target.value);
                            if (!qrCodeName) setQrCodeName(e.target.value);
                          }}
                          placeholder="Food Coupon"
                          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)] font-medium"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                          QR Code Name: *
                        </label>
                        <input
                          type="text"
                          value={qrCodeName}
                          onChange={(e) => setQrCodeName(e.target.value)}
                          placeholder="Food Coupon / Lunch Coupon"
                          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)] font-medium"
                          required
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                          QR Description:
                        </label>
                        <input
                          type="text"
                          value={qrDescription}
                          onChange={(e) => setQrDescription(e.target.value)}
                          placeholder="Meal coupon for registered participants"
                          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)]"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                          Multi-Day Validity:
                        </label>
                        <select
                          value={qrValidDay}
                          onChange={(e) => setQrValidDay(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)] font-medium"
                        >
                          <option value="all">Valid for the entire event</option>
                          <option value={1}>Valid only on Day 1</option>
                          <option value={2}>Valid only on Day 2</option>
                          <option value={3}>Valid only on Day 3</option>
                          <option value={4}>Valid only on Day 4</option>
                          <option value={5}>Valid only on Day 5</option>
                        </select>
                      </div>

                      <div className="flex flex-col justify-center space-y-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={autoGenerateNew}
                            onChange={(e) => setAutoGenerateNew(e.target.checked)}
                            className="rounded border-[var(--border-subtle)] text-[var(--gold)] focus:ring-[var(--gold)]"
                          />
                          <span className="font-bold text-[var(--fg)]">
                            Automatically Generate for New Registrations
                          </span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={generateForExisting}
                            onChange={(e) => setGenerateForExisting(e.target.checked)}
                            className="rounded border-[var(--border-subtle)] text-[var(--gold)] focus:ring-[var(--gold)]"
                          />
                          <span className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
                            Generate for Existing Participants
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                        Field Name / Question Label *
                      </label>
                      <input
                        type="text"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        placeholder="e.g. Full Name, College, Emergency Contact, etc."
                        className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)] font-medium"
                        required
                      />
                    </div>

                    {(customType === 'dropdown' || customType === 'radio' || customType === 'checkbox') ? (
                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                          Choices / Options (comma-separated) *
                        </label>
                        <input
                          type="text"
                          value={customOptionsInput}
                          onChange={(e) => setCustomOptionsInput(e.target.value)}
                          placeholder="e.g. Yes, No, Maybe or S, M, L, XL"
                          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)]"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold mb-1">
                          Placeholder Text (Optional)
                        </label>
                        <input
                          type="text"
                          value={customPlaceholder}
                          onChange={(e) => setCustomPlaceholder(e.target.value)}
                          placeholder="e.g. Type answer here..."
                          className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border-subtle)] focus:border-[var(--gold)] rounded text-[var(--fg)]"
                        />
                      </div>
                    )}

                    {/* Toggles */}
                    <div className="flex items-center gap-6 pt-2 sm:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customRequired}
                          onChange={(e) => setCustomRequired(e.target.checked)}
                          className="rounded border-[var(--border-subtle)] text-[var(--gold)] focus:ring-[var(--gold)]"
                        />
                        <span className="font-bold text-[var(--fg)]">Required Question</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={customShowOnTicket}
                          onChange={(e) => setCustomShowOnTicket(e.target.checked)}
                          className="rounded border-[var(--border-subtle)] text-[var(--gold)] focus:ring-[var(--gold)]"
                        />
                        <span className="font-bold text-[var(--gold)] flex items-center gap-1">
                          <Ticket className="w-3.5 h-3.5" /> Show on Downloaded Ticket
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsAddingCustom(false)}
                    className="px-4 py-2 border border-[var(--border-subtle)] text-[var(--fg-muted)] hover:text-[var(--fg)] rounded text-xs uppercase tracking-wider font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[var(--gold)] text-black rounded text-xs uppercase tracking-wider font-bold hover:bg-[var(--gold)]/90 shadow-sm cursor-pointer"
                  >
                    {(customType === 'dynamic_qr' || customType === 'qr_code') ? 'Create QR Field' : 'Add Dynamic Field'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Live Participant Form Preview */
        <div className="p-6 bg-[var(--bg-card)] border border-[var(--gold)]/30 rounded-lg space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h4 className="text-base font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                Attendee Registration Form Preview
              </h4>
              <p className="text-xs text-[var(--fg-muted)] mt-0.5">
                This is exactly how attendees will see the form when registering for your event.
              </p>
            </div>
            <span className="text-xs bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 px-3 py-1 rounded-full font-bold">
              Preview Mode
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const isQr = field.type === 'dynamic_qr' || field.type === 'qr_code';
              if (isQr) {
                return (
                  <div
                    key={field.id}
                    className="p-3 bg-[var(--gold)]/10 border border-[var(--gold)]/40 rounded-lg md:col-span-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-[var(--gold)] flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5" />
                        {field.label} ({field.qrCodeName || 'Auto-Generated QR Pass'})
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[var(--gold)] bg-[var(--gold)]/20 px-2 py-0.5 rounded border border-[var(--gold)]/30">
                        Auto-Generated QR Pass
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--fg-muted)]">
                      A unique QR code will be generated automatically for each attendee upon registration and sent to their email. Attendees do not need to fill out this field.
                    </p>
                  </div>
                );
              }

              return (
                <div
                  key={field.id}
                  className={`p-3 bg-[var(--bg)]/70 border rounded-lg ${
                    field.type === 'textarea' ? 'md:col-span-2' : ''
                  } ${field.showOnTicket ? 'border-[var(--gold)]/30' : 'border-[var(--border-subtle)]'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-[var(--fg)]">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.showOnTicket && (
                      <span className="text-[10px] text-[var(--gold)] flex items-center gap-1 font-bold">
                        <Ticket className="w-2.5 h-2.5" /> Appears on Ticket
                      </span>
                    )}
                  </div>

                {field.type === 'textarea' ? (
                  <textarea
                    rows={2}
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-xs text-[var(--fg)] resize-none"
                    disabled
                  />
                ) : field.type === 'dropdown' ? (
                  <select
                    className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-xs text-[var(--fg)]"
                    disabled
                  >
                    <option value="">Select {field.label}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'radio' ? (
                  <div className="flex flex-wrap gap-4 pt-1">
                    {field.options?.map((opt) => (
                      <label key={opt} className="flex items-center gap-1.5 text-xs text-[var(--fg)]">
                        <input type="radio" name={field.id} disabled />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <div className="flex flex-wrap gap-4 pt-1">
                    {field.options && field.options.length > 0 ? (
                      field.options.map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 text-xs text-[var(--fg)]">
                          <input type="checkbox" disabled />
                          <span>{opt}</span>
                        </label>
                      ))
                    ) : (
                      <label className="flex items-center gap-1.5 text-xs text-[var(--fg)]">
                        <input type="checkbox" disabled />
                        <span>I agree / confirm {field.label}</span>
                      </label>
                    )}
                  </div>
                ) : (
                  <input
                    type={
                      field.type === 'number'
                        ? 'number'
                        : field.type === 'email'
                        ? 'email'
                        : field.type === 'phone'
                        ? 'tel'
                        : 'text'
                    }
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded text-xs text-[var(--fg)]"
                    disabled
                  />
                )}
              </div>
            );
          })}
        </div>
        </div>
      )}
    </div>
  );
}
