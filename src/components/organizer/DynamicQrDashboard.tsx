'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  Zap,
  Send,
  Eye,
  Download,
  Scan,
  RefreshCw,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Search,
  Mail,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { motion, AnimatePresence } from 'framer-motion';
import type { DynamicQrPass } from '@/types/firestore';

interface DynamicQrStatsItem {
  fieldId: string;
  fieldName: string;
  qrName: string;
  validDayNumber?: number | 'all';
  enabled: boolean;
  generated: number;
  sent: number;
  redeemed: number;
  remaining: number;
}

interface DynamicQrDashboardProps {
  eventId: string;
  eventTitle: string;
  onOpenScanner?: () => void;
  onOpenFormFields?: () => void;
}

export default function DynamicQrDashboard({
  eventId,
  eventTitle,
  onOpenScanner,
  onOpenFormFields
}: DynamicQrDashboardProps) {
  const [stats, setStats] = useState<DynamicQrStatsItem[]>([]);
  const [passes, setPasses] = useState<DynamicQrPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // View modal state
  const [selectedFieldForView, setSelectedFieldForView] = useState<DynamicQrStatsItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [resendingPassId, setResendingPassId] = useState<string | null>(null);

  const fetchDynamicQrData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/organizer/dynamic-qr?eventId=${encodeURIComponent(eventId)}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStats(data.stats || []);
          setPasses(data.passes || []);
        }
      }
    } catch (err) {
      console.error('Error fetching dynamic QR data:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchDynamicQrData();
  }, [fetchDynamicQrData]);

  // Action: Generate QR codes for existing participants
  const handleGenerate = async (fieldId: string, fieldName: string) => {
    try {
      setActionLoading(`generate_${fieldId}`);
      setStatusMessage(null);
      const res = await fetch('/api/organizer/dynamic-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_existing',
          eventId,
          fieldId
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: data.message || `Generated QR passes for ${fieldName}`,
          type: 'success'
        });
        await fetchDynamicQrData();
      } else {
        setStatusMessage({ text: data.message || data.error || 'Failed to generate passes', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Server error generating passes', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Send QR emails to registered participants
  const handleSendEmails = async (fieldId: string, fieldName: string) => {
    try {
      setActionLoading(`send_${fieldId}`);
      setStatusMessage(null);
      const res = await fetch('/api/organizer/dynamic-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_emails',
          eventId,
          fieldId
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: data.message || `Sent QR emails for ${fieldName}`,
          type: 'success'
        });
        await fetchDynamicQrData();
      } else {
        setStatusMessage({ text: data.message || data.error || 'Failed to send QR emails', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Server error sending emails', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  // Action: Resend single email
  const handleResendSingle = async (passId: string) => {
    try {
      setResendingPassId(passId);
      const res = await fetch('/api/organizer/dynamic-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_emails',
          eventId,
          passId
        })
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ text: 'Email resent successfully!', type: 'success' });
        await fetchDynamicQrData();
      } else {
        setStatusMessage({ text: data.message || 'Failed to resend email', type: 'error' });
      }
    } catch (err: any) {
      setStatusMessage({ text: err?.message || 'Error resending email', type: 'error' });
    } finally {
      setResendingPassId(null);
    }
  };

  // Export CSV for a field
  const handleExportCSV = (field: DynamicQrStatsItem) => {
    const fieldPasses = passes.filter(p => p.fieldId === field.fieldId);
    if (fieldPasses.length === 0) {
      alert(`No passes generated yet for ${field.qrName || field.fieldName}`);
      return;
    }

    const headers = [
      'Participant Name',
      'Email',
      'Phone',
      'QR Pass Code',
      'Coupon Name',
      'Valid Day',
      'Status',
      'Email Status',
      'Registration ID',
      'Ticket ID',
      'Created At',
      'Redeemed At',
      'Redeemed By'
    ];

    const rows = fieldPasses.map(p => [
      `"${p.participantName || ''}"`,
      `"${p.participantEmail || ''}"`,
      `"${p.participantPhone || ''}"`,
      `"${p.code}"`,
      `"${p.qrName || p.fieldName}"`,
      `"${p.validDayNumber ? `Day ${p.validDayNumber}` : 'All Days'}"`,
      `"${p.status}"`,
      `"${p.emailStatus || 'pending'}"`,
      `"${p.registrationId || ''}"`,
      `"${p.ticketId || ''}"`,
      `"${p.createdAt || ''}"`,
      `"${p.redeemedAt || ''}"`,
      `"${p.redeemedBy || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${field.fieldName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qrs.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered passes for View Modal
  const viewPasses = selectedFieldForView
    ? passes
        .filter(p => p.fieldId === selectedFieldForView.fieldId)
        .filter(p => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return (
            (p.participantName && p.participantName.toLowerCase().includes(q)) ||
            (p.participantEmail && p.participantEmail.toLowerCase().includes(q)) ||
            (p.code && p.code.toLowerCase().includes(q)) ||
            (p.status && p.status.toLowerCase().includes(q))
          );
        })
    : [];

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl p-5 sm:p-6 mb-8 font-[family-name:var(--font-josefin)]">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-subtle)] gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-[var(--gold)] flex items-center justify-center bg-[var(--bg)] shadow-[0_0_12px_var(--gold-glow)]">
            <QrCode className="w-5 h-5 text-[var(--gold)]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide flex items-center gap-2">
              DYNAMIC QR CODES
              {stats.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/30 font-sans normal-case">
                  {stats.length} field{stats.length !== 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <p className="text-xs text-[var(--fg-muted)]">
              Dynamic passes for food coupons, merchandise, VIP lounges & perks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenFormFields && (
            <button
              onClick={onOpenFormFields}
              className="px-3 py-1.5 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/30 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Dynamic Field</span>
            </button>
          )}
          <button
            onClick={fetchDynamicQrData}
            disabled={loading}
            className="p-1.5 text-[var(--fg-muted)] hover:text-white border border-[var(--border-subtle)] rounded transition-colors"
            title="Refresh Dynamic QR Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status banner */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 p-3 rounded text-xs flex items-center justify-between border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-red-950/40 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-xs opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic QR Fields Grid */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <Spinner />
          <p className="text-xs text-[var(--gold)] mt-3 uppercase tracking-wider">Loading Dynamic QR codes...</p>
        </div>
      ) : stats.length === 0 ? (
        <div className="border border-dashed border-[var(--border-subtle)] rounded-xl p-8 text-center bg-[var(--bg)]/40">
          <div className="w-12 h-12 rounded-full border border-[var(--border-subtle)] flex items-center justify-center mx-auto mb-3 text-[var(--fg-muted)]">
            <QrCode className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
            No Dynamic QR Fields Configured Yet
          </h4>
          <p className="text-xs text-[var(--fg-muted)] mt-1 max-w-md mx-auto">
            Create fields like Food Coupon, Lunch Coupon, or VIP Pass in the Form Fields section to automatically generate scannable QR passes for participants.
          </p>
          {onOpenFormFields && (
            <button
              onClick={onOpenFormFields}
              className="mt-4 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-white text-xs font-bold uppercase tracking-wider rounded inline-flex items-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Dynamic Field</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {stats.map(field => {
            const isGenerating = actionLoading === `generate_${field.fieldId}`;
            const isSending = actionLoading === `send_${field.fieldId}`;

            return (
              <div
                key={field.fieldId}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-5 transition-all hover:border-[var(--border-gold)]/40"
              >
                {/* Field Top Info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-base font-bold text-[var(--gold)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                        {field.qrName || field.fieldName}
                      </h4>
                      {field.validDayNumber && field.validDayNumber !== 'all' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono">
                          Day {field.validDayNumber} Only
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
                          Entire Event
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--fg-muted)]">
                      Field Name: {field.fieldName}
                    </span>
                  </div>
                </div>

                {/* Counters Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-3 text-center">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] block mb-1">Generated</span>
                    <span className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)]">
                      {field.generated}
                    </span>
                  </div>

                  <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-3 text-center">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] block mb-1">Sent</span>
                    <span className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-marcellus)] text-emerald-400">
                      {field.sent}
                    </span>
                  </div>

                  <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-3 text-center">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] block mb-1">Redeemed</span>
                    <span className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-marcellus)] text-blue-400">
                      {field.redeemed}
                    </span>
                  </div>

                  <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-sm p-3 text-center">
                    <span className="text-[10px] uppercase tracking-widest text-[var(--fg-muted)] block mb-1">Remaining</span>
                    <span className="text-xl sm:text-2xl font-bold font-[family-name:var(--font-marcellus)] text-amber-400">
                      {field.remaining}
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Generate, Send, View, Export, Scan */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    onClick={() => handleGenerate(field.fieldId, field.fieldName)}
                    disabled={isGenerating}
                    className="px-3.5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-light)] disabled:opacity-50 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                    title="Generate unique QR code for every registered participant"
                  >
                    {isGenerating ? <Spinner inline /> : <Zap className="w-3.5 h-3.5" />}
                    <span>Generate</span>
                  </button>

                  <button
                    onClick={() => handleSendEmails(field.fieldId, field.fieldName)}
                    disabled={isSending || field.generated === 0}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
                    title="Send QR code emails to registered participants"
                  >
                    {isSending ? <Spinner inline /> : <Send className="w-3.5 h-3.5" />}
                    <span>Send</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedFieldForView(field);
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--fg)] border border-[var(--border-subtle)] rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-[var(--gold)]" />
                    <span>View</span>
                  </button>

                  <button
                    onClick={() => handleExportCSV(field)}
                    disabled={field.generated === 0}
                    className="px-3.5 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--fg)] border border-[var(--border-subtle)] disabled:opacity-40 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Export</span>
                  </button>

                  {onOpenScanner && (
                    <button
                      onClick={onOpenScanner}
                      className="px-3.5 py-2 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)]/40 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ml-auto"
                    >
                      <Scan className="w-3.5 h-3.5 text-[var(--gold)]" />
                      <span>Scan</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODAL: Participant | QR | Email | Status */}
      <AnimatePresence>
        {selectedFieldForView && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedFieldForView(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--bg-card)] border border-[var(--border-gold)] rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl my-6"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wide flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-[var(--gold)]" />
                    <span>{selectedFieldForView.qrName || selectedFieldForView.fieldName} — Generated Passes</span>
                  </h3>
                  <p className="text-xs text-[var(--fg-muted)]">
                    Total {viewPasses.length} pass{viewPasses.length !== 1 ? 'es' : ''} listed
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFieldForView(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-full bg-[var(--bg)] border border-[var(--border-subtle)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search & Actions Bar */}
              <div className="p-4 bg-[var(--bg)]/50 border-b border-[var(--border-subtle)] flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-[var(--fg-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search participant, QR, email..."
                    className="w-full pl-9 pr-3 py-1.5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-xs text-white placeholder-[var(--fg-muted)] focus:border-[var(--gold)] outline-none"
                  />
                </div>

                <button
                  onClick={() => handleExportCSV(selectedFieldForView)}
                  className="px-3 py-1.5 border border-[var(--border-subtle)] hover:border-[var(--gold)] text-xs text-[var(--fg)] rounded flex items-center gap-1.5 uppercase font-bold tracking-wider"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto p-4">
                {viewPasses.length === 0 ? (
                  <div className="text-center py-12 text-[var(--fg-muted)] text-sm">
                    No participant passes match the filter.
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-wider text-[var(--gold)]">
                        <th className="py-2.5 px-3">Participant</th>
                        <th className="py-2.5 px-3">QR Code</th>
                        <th className="py-2.5 px-3">Email Delivery</th>
                        <th className="py-2.5 px-3">Pass Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {viewPasses.map(pass => {
                        const isResending = resendingPassId === pass.id;
                        return (
                          <tr key={pass.id} className="hover:bg-white/[0.02] transition-colors">
                            {/* Participant */}
                            <td className="py-3 px-3">
                              <span className="font-semibold text-white block">{pass.participantName || 'N/A'}</span>
                              <span className="text-[11px] text-[var(--fg-muted)] truncate block max-w-[180px]">
                                {pass.participantEmail || 'No email provided'}
                              </span>
                            </td>

                            {/* QR */}
                            <td className="py-3 px-3">
                              <span className="font-mono text-[var(--gold)] font-bold text-xs bg-[var(--bg)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                                {pass.code}
                              </span>
                            </td>

                            {/* Email Status */}
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                pass.emailStatus === 'sent'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : pass.emailStatus === 'failed'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              }`}>
                                {pass.emailStatus === 'sent' && <CheckCircle className="w-3 h-3" />}
                                {pass.emailStatus === 'failed' && <AlertCircle className="w-3 h-3" />}
                                {pass.emailStatus === 'pending' && <Clock className="w-3 h-3" />}
                                <span>{pass.emailStatus || 'pending'}</span>
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                                pass.status === 'redeemed'
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                  : pass.status === 'cancelled'
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {pass.status === 'redeemed' ? 'Redeemed' : pass.status === 'cancelled' ? 'Cancelled' : 'Active'}
                              </span>
                              {pass.redeemedAt && (
                                <span className="block text-[9px] text-[var(--fg-muted)] mt-0.5">
                                  {new Date(typeof pass.redeemedAt === 'string' ? pass.redeemedAt : (pass.redeemedAt as any)?.toDate?.() || pass.redeemedAt).toLocaleDateString()}
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => handleResendSingle(pass.id || '')}
                                disabled={isResending}
                                className="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded border border-[var(--border-subtle)] hover:border-[var(--gold)] text-[var(--fg-muted)] hover:text-white transition-all disabled:opacity-50 inline-flex items-center gap-1"
                                title="Resend email with QR code"
                              >
                                {isResending ? <Spinner inline /> : <Mail className="w-3 h-3 text-[var(--gold)]" />}
                                <span>{pass.emailStatus === 'sent' ? 'Resend' : 'Send'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
