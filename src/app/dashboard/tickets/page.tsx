/**
 * User Tickets Dashboard
 * Shows all tickets owned by the current user
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Ticket, Calendar, MapPin, Clock, CheckCircle, Download, Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { TicketData } from '@/lib/payment';
import { downloadTicketImage, downloadAllTickets } from '@/lib/ticket-canvas';
import { getDisplayTicketId, isSimpleTicketId } from '@/lib/ticket-id';
import QRCode from 'react-qr-code';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function UserTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchUserTickets();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchUserTickets = async () => {
    try {
      setLoading(true);
      const idToken = await user!.getIdToken();
      
      const response = await fetch('/api/tickets/user', {
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to load tickets');
      }
      const result = await response.json();
      setTickets(result.tickets || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load your tickets');
    } finally {
      setLoading(false);
    }
  };

  const downloadTicket = async (ticket: TicketData) => {
    const tId = ticket.ticketId || ticket.id;
    try {
      setDownloadingId(tId);
      await downloadTicketImage(ticket);
    } catch (err) {
      console.error('Download ticket error:', err);
      alert('Failed to download ticket image. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (tickets.length === 0 || downloadingAll) return;
    try {
      setDownloadingAll(true);
      await downloadAllTickets(tickets);
    } catch (err) {
      console.error('Download all error:', err);
      alert('Error downloading some tickets. Please try individual tickets.');
    } finally {
      setDownloadingAll(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] font-[family-name:var(--font-josefin)] flex items-center justify-center pt-20">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-[var(--fg-muted)] mt-4 uppercase tracking-wider text-sm">Loading tickets...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center py-20 px-4 font-[family-name:var(--font-josefin)]">
        <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 text-center max-w-md w-full relative corner-bracket">



          <p className="text-[var(--fg-muted)] mb-6 text-lg uppercase tracking-wide">
            Please log in to view your tickets
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] border border-[var(--primary)] uppercase tracking-widest text-xs font-bold transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <Spinner />
          <p className="text-[var(--fg-muted)] font-[family-name:var(--font-josefin)] uppercase tracking-widest text-sm">Loading your tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] py-20 px-4 sm:px-6 lg:px-8 font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="fixed inset-0 bg-pattern opacity-10 pointer-events-none z-0"></div>

      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] w-full p-8 text-center relative corner-bracket">
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border border-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)] flex items-center justify-center bg-[var(--bg)]">
                 <Ticket className="w-6 h-6 text-[var(--primary)] transform -rotate-45" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide">
                Your Tickets
              </h1>
            </div>
            <p className="text-[var(--fg-muted)] mt-4">
              Manage all your event tickets in one place
            </p>

            {tickets.length > 1 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)] uppercase tracking-widest text-xs font-bold transition-all disabled:opacity-50"
                >
                  {downloadingAll ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Downloading All ({tickets.length})...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download All Tickets ({tickets.length})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {error ? (
          <div className="bg-[var(--bg-card)] border border-red-500/30 w-full p-8 text-center">
            <div className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <div className="text-red-500 mb-4 text-lg font-bold uppercase tracking-wide">{error}</div>
            <button
              onClick={fetchUserTickets}
              className="px-6 py-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] border border-[var(--primary)] uppercase tracking-widest text-xs font-bold transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] w-full p-12 text-center relative corner-bracket">

            <Ticket className="w-16 h-16 text-[var(--fg-muted)] mx-auto mb-6 opacity-50" />

            <h2 className="text-2xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] uppercase tracking-wide mb-4">No Tickets Found</h2>
            <p className="text-[var(--fg-muted)] mb-8 max-w-md mx-auto">
              You haven&apos;t purchased any tickets yet. Browse events to find something amazing to attend!
            </p>
            <Link
              href="/events"
              className="inline-flex items-center justify-center px-8 py-4 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] border border-[var(--primary)] uppercase tracking-widest text-xs font-bold transition-all duration-300"
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tickets.map((ticket, index) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:shadow-[0_0_25px_var(--primary-glow)] hover:border-[var(--primary)] transition-all duration-300 relative group h-full flex flex-col corner-bracket"
              >
                  {/* Ticket Header */}
                  <div className="p-6 border-b border-[var(--border-subtle)] flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 line-clamp-2 uppercase tracking-wide group-hover:text-[var(--primary)] transition-colors">
                          {ticket.eventData?.title || 'Event Title Unavailable'}
                        </h3>
                        <p className="text-xs text-[var(--fg-muted)] uppercase tracking-widest font-bold">
                          Ticket #{ticket.ticketNumber} of {ticket.totalTickets}
                        </p>
                      </div>
                      <div className={`p-2 rounded-full border ${
                        ticket.isCheckedIn 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-[var(--gold)]/10 text-[var(--gold)] border-[var(--gold)]/20'
                      }`}>
                        {ticket.isCheckedIn ? <CheckCircle className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">
                        <Calendar className="w-4 h-4 mr-3 text-[var(--gold)]" />
                        {ticket.eventData?.dateTime?.startDate
                          ? new Date(ticket.eventData.dateTime.startDate).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Date unavailable'
                        }
                      </div>

                      <div className="flex items-center text-[var(--fg-muted)] group-hover:text-[var(--fg)] transition-colors">
                        <MapPin className="w-4 h-4 mr-3 text-[var(--gold)]" />
                        {typeof ticket.eventData?.venue === 'string'
                          ? ticket.eventData.venue
                          : (ticket.eventData?.venue as { name?: string } | undefined)?.name || 'Location unavailable'}
                      </div>

                      <div className="flex items-center text-[var(--fg-muted)]">
                        <Clock className="w-4 h-4 mr-3 text-[var(--gold)]" />
                        Status: {ticket.isCheckedIn ? (
                          <span className="text-green-500 ml-1 font-bold uppercase text-xs tracking-wider">Checked In</span>
                        ) : (
                          <span className="text-[var(--primary)] ml-1 font-bold uppercase text-xs tracking-wider">Ready to Use</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="p-6 bg-[var(--bg)]/50 mt-auto">
                    <div className="bg-white p-4 border border-[var(--border-subtle)] mb-4 flex items-center justify-center relative">
                       {/* Corner accents for QR frame */}
                       <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-black"></div>
                       <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-black"></div>
                       <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-black"></div>
                       <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-black"></div>
                       
                      <QRCode
                        value={ticket.qrCodeData && isSimpleTicketId(ticket.qrCodeData) ? ticket.qrCodeData : getDisplayTicketId(ticket)}
                        size={120}
                        className="max-w-full h-auto"
                      />
                    </div>

                    <div className="text-center mb-4">
                      <p className="text-[10px] text-[var(--fg-muted)] mb-1 uppercase tracking-widest font-bold">Ticket ID</p>
                      <p className="font-mono text-xs text-[var(--fg)] break-all border border-[var(--border-subtle)] px-2 py-1 bg-[var(--bg)]">
                        {getDisplayTicketId(ticket)}
                      </p>
                    </div>

                    <button
                      onClick={() => downloadTicket(ticket)}
                      disabled={downloadingId === (ticket.ticketId || ticket.id)}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-transparent hover:bg-[var(--primary)] text-[var(--primary)] hover:text-[var(--fg)] border border-[var(--primary)] transition-all duration-300 uppercase tracking-widest text-xs font-bold group/btn disabled:opacity-50"
                    >
                      {downloadingId === (ticket.ticketId || ticket.id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Pass...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 group-hover/btn:animate-bounce" />
                          <span>Download Ticket</span>
                        </>
                      )}
                    </button>
                  </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
