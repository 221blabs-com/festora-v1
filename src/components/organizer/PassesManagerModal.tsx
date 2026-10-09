'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Edit2, Ticket, Check, AlertCircle, Save, RotateCcw } from 'lucide-react';
import { EventTicketPass, DEFAULT_POSTER_PASSES } from '@/types/event';

interface PassesManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  ticketPasses?: EventTicketPass[];
  onSaved: (passes: EventTicketPass[]) => void;
}

export default function PassesManagerModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  ticketPasses,
  onSaved
}: PassesManagerModalProps) {
  const [passes, setPasses] = useState<EventTicketPass[]>(() => {
    if (ticketPasses && ticketPasses.length > 0) {
      return ticketPasses;
    }
    return DEFAULT_POSTER_PASSES;
  });

  const [editingPass, setEditingPass] = useState<EventTicketPass | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEditPass = (pass: EventTicketPass) => {
    setEditingPass({ ...pass });
    setIsCreatingNew(false);
    setError(null);
  };

  const handleAddNewPass = () => {
    const newPass: EventTicketPass = {
      id: `pass_${Date.now()}`,
      name: 'Custom Pass',
      price: 299,
      currency: 'INR',
      badgeText: 'TEAM • 2 PEOPLE',
      teamSize: 2,
      capacity: 50,
      soldCount: 0,
      purchaseLimitMin: 1,
      purchaseLimitMax: 2,
      purchaseLimitText: '1 - 2 per order',
      description: 'Access pass for event workshops and team challenges.',
      status: 'active',
      includesFoodCoupon: true
    };
    setEditingPass(newPass);
    setIsCreatingNew(true);
    setError(null);
  };

  const handleDeletePass = (passId: string) => {
    if (passes.length <= 1) {
      setError('You must keep at least one pass available for registration.');
      return;
    }
    setPasses(prev => prev.filter(p => p.id !== passId));
    if (editingPass?.id === passId) {
      setEditingPass(null);
      setIsCreatingNew(false);
    }
  };

  const handleSaveEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPass) return;

    if (!editingPass.name.trim()) {
      setError('Pass name is required.');
      return;
    }

    if (isCreatingNew) {
      setPasses(prev => [...prev, editingPass]);
    } else {
      setPasses(prev => prev.map(p => p.id === editingPass.id ? editingPass : p));
    }

    setEditingPass(null);
    setIsCreatingNew(false);
    setError(null);
  };

  const handleResetToDefaults = () => {
    setPasses(DEFAULT_POSTER_PASSES);
    setEditingPass(null);
    setIsCreatingNew(false);
    setError(null);
  };

  const handleSaveAllToDatabase = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/update/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketPasses: passes })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save ticket passes');
      }

      setSaveSuccess(true);
      onSaved(passes);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      console.error('Error saving ticket passes:', err);
      setError(err.message || 'Failed to update ticket passes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#080d1a] border border-[#1e293b] rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden relative"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#1e293b] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-[var(--gold)]" />
                <h2 className="text-xl font-bold text-white font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                  Ticket Passes Manager
                </h2>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {eventTitle} • Configure Solo, Duo, Early Bird, and tiered event passes
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {error && (
              <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Ticket passes saved successfully!</span>
              </div>
            )}

            {/* Top Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider">
                  Active Event Passes ({passes.length})
                </h3>
                <p className="text-xs text-gray-400">
                  Matches your event poster and displayed on attendee checkout.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="px-3 py-1.5 rounded-lg border border-[#1e293b] hover:border-gray-500 bg-[#0e1626] text-xs font-semibold text-gray-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Reset to Solo ₹249, Duo ₹499, Early Bird ₹449 poster defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleAddNewPass}
                  className="px-3.5 py-1.5 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Pass
                </button>
              </div>
            </div>

            {/* Cards Grid Matching Image 1 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {passes.map((pass) => (
                <div
                  key={pass.id}
                  className="rounded-2xl p-5 bg-[#0b1220] border border-[#1e293b] hover:border-gray-500 transition-all relative flex flex-col justify-between shadow-lg"
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase bg-[#092231] text-[#38bdf8] border border-[#0284c7]/40">
                      {pass.badgeText || (pass.teamSize === 1 ? 'SOLO • 1 PERSON' : `DUO • ${pass.teamSize || 2} PEOPLE`)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#063e2c] text-[#34d399] border border-[#059669]/40">
                      {pass.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-white font-[family-name:var(--font-marcellus)] mb-1">
                    {pass.name}
                  </h3>

                  {/* Price */}
                  <div className="text-3xl font-extrabold text-[#facc15] font-mono tracking-tight my-1.5">
                    ₹{pass.price}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-300 leading-relaxed mb-4 min-h-[3rem]">
                    {pass.description}
                  </p>

                  {/* Specs Box Container */}
                  <div className="p-3 bg-[#050811] border border-[#1e293b]/70 rounded-xl mb-4 grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="font-bold uppercase tracking-wider text-gray-400 block text-[9px]">
                        SOLD / CAPACITY
                      </span>
                      <span className="font-mono font-bold text-gray-200 mt-0.5 block">
                        {pass.soldCount || 0} / {pass.capacity}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-gray-400 block text-[9px]">
                        PURCHASE LIMIT
                      </span>
                      <span className="font-mono font-bold text-gray-200 mt-0.5 block">
                        {pass.purchaseLimitText || (pass.teamSize === 1 ? '1 - 5 per order' : '1 - 2 per order')}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons Matching Image 1 (Edit / Trash) */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1e293b]/60">
                    <button
                      type="button"
                      onClick={() => handleEditPass(pass)}
                      className="px-3 py-1.5 bg-[#131c2d] hover:bg-[#1a263e] border border-[#2d3a52] text-xs font-semibold text-gray-200 hover:text-white rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-yellow-400" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePass(pass.id)}
                      className="p-1.5 bg-[#131c2d] hover:bg-red-950/60 border border-[#2d3a52] hover:border-red-700 text-gray-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
                      title="Delete pass"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pass Editor Modal / Drawer */}
            {editingPass && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-[#0c1424] border border-[var(--gold)]/40 rounded-2xl space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#1e293b]">
                  <h4 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-[var(--gold)]" />
                    {isCreatingNew ? 'Create New Pass' : `Edit Pass: ${editingPass.name}`}
                  </h4>
                  <button
                    type="button"
                    onClick={() => { setEditingPass(null); setIsCreatingNew(false); }}
                    className="text-gray-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditor} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="block text-gray-400 font-bold uppercase mb-1.5">Pass Name *</label>
                      <input
                        type="text"
                        value={editingPass.name}
                        onChange={(e) => setEditingPass({ ...editingPass, name: e.target.value })}
                        className="w-full px-3 py-2 bg-[#060a12] border border-[#1e293b] rounded-lg text-white focus:border-[var(--gold)] focus:outline-none"
                        placeholder="e.g. Solo, Duo, VIP"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-bold uppercase mb-1.5">Price (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        value={editingPass.price}
                        onChange={(e) => setEditingPass({ ...editingPass, price: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#060a12] border border-[#1e293b] rounded-lg text-white focus:border-[var(--gold)] focus:outline-none font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-bold uppercase mb-1.5">Team Size (People) *</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={editingPass.teamSize || 1}
                        onChange={(e) => {
                          const size = Number(e.target.value) || 1;
                          setEditingPass({
                            ...editingPass,
                            teamSize: size,
                            badgeText: size === 1 ? 'SOLO • 1 PERSON' : `DUO • ${size} PEOPLE`
                          });
                        }}
                        className="w-full px-3 py-2 bg-[#060a12] border border-[#1e293b] rounded-lg text-white focus:border-[var(--gold)] focus:outline-none font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-bold uppercase mb-1.5">Badge Text</label>
                      <input
                        type="text"
                        value={editingPass.badgeText || ''}
                        onChange={(e) => setEditingPass({ ...editingPass, badgeText: e.target.value })}
                        className="w-full px-3 py-2 bg-[#060a12] border border-[#1e293b] rounded-lg text-white focus:border-[var(--gold)] focus:outline-none"
                        placeholder="e.g. SOLO • 1 PERSON"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-bold uppercase mb-1.5">Total Capacity *</label>
                      <input
                        type="number"
                        min="1"
                        value={editingPass.capacity}
                        onChange={(e) => setEditingPass({ ...editingPass, capacity: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-[#060a12] border border-[#1e293b] rounded-lg text-white focus:border-[var(--gold)] focus:outline-none font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-bold uppercase mb-1.5">Purchase Limit Text</label>
                      <input
                        type="text"
                        value={editingPass.purchaseLimitText || ''}
                        onChange={(e) => setEditingPass({ ...editingPass, purchaseLimitText: e.target.value })}
                        className="w-full px-3 py-2 bg-[#060a12] border border-[#1e293b] rounded-lg text-white focus:border-[var(--gold)] focus:outline-none"
                        placeholder="e.g. 1 - 2 per order"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold uppercase mb-1.5 text-xs">Description *</label>
                    <textarea
                      rows={2}
                      value={editingPass.description}
                      onChange={(e) => setEditingPass({ ...editingPass, description: e.target.value })}
                      className="w-full px-3 py-2 bg-[#060a12] border border-[#1e293b] rounded-lg text-white focus:border-[var(--gold)] focus:outline-none text-xs"
                      placeholder="Describe privileges, coupons, access permissions..."
                      required
                    />
                  </div>

                  <div className="flex items-center gap-6 text-xs text-gray-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingPass.includesFoodCoupon)}
                        onChange={(e) => setEditingPass({ ...editingPass, includesFoodCoupon: e.target.checked })}
                        className="accent-[var(--gold)] w-4 h-4"
                      />
                      <span>Includes Dynamic Food Coupon QR</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-gray-400">Status:</span>
                      <select
                        value={editingPass.status || 'active'}
                        onChange={(e) => setEditingPass({ ...editingPass, status: e.target.value as any })}
                        className="bg-[#060a12] border border-[#1e293b] rounded px-2 py-1 text-white text-xs"
                      >
                        <option value="active">Active</option>
                        <option value="sold_out">Sold Out</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setEditingPass(null); setIsCreatingNew(false); }}
                      className="px-4 py-2 rounded-lg border border-[#1e293b] text-xs font-semibold text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-[var(--gold)] text-black font-bold text-xs shadow-md cursor-pointer hover:bg-[var(--gold)]/90"
                    >
                      Apply to Pass
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-[#1e293b] bg-[#070b16] flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Changes will update live pass registration immediately.
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-lg border border-[#1e293b] text-xs font-semibold text-gray-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAllToDatabase}
                className="px-6 py-2.5 rounded-lg bg-[var(--gold)] hover:bg-[var(--gold)]/90 text-black text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isSaving ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save All Passes
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
