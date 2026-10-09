/**
 * Checkout Modal Component — Art Deco Theme
 * Handles ticket purchase flow with Cashfree integration and team registration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Clock, Users, Download, Ticket } from 'lucide-react';
import { createPaymentOrder, initializeRazorpayPayment, formatCurrency, getRemainingTickets, hasUserTicketsForEvent, getUserTicketsForEvent, TicketData } from '@/lib/payment';
import { downloadTicketImage, downloadAllTickets } from '@/lib/ticket-canvas';
import { Spinner } from '@/components/ui/spinner';
import type { Event as PaymentEvent } from '@/types/event';
import { useAuth } from '@/contexts/auth-context';
import { TeamRegistrationModal } from './team-registration-modal';
import { SuccessNotification } from '@/components/ui/success-notification';

// Flexible event type to handle actual Firestore data shape
interface CheckoutEvent {
  id: string;
  title: string;
  description?: string;
  image?: string;
  dateTime?: {
    startDate: string;
    endDate?: string;
  };
  venue?: string | { name?: string };
  price?: number;
  ticketPrice?: number;
  isPaid?: boolean;
  totalTickets?: number;
  capacity?: number;
  ticketsSold?: number;
  isTeamEvent?: boolean;
  isMultiDay?: boolean;
  eventDays?: Array<{ dayNumber: number; date: string; startTime?: string; endTime?: string; title?: string }>;
  registrationFields?: import('@/types/event').EventRegistrationFields;
  teamSettings?: {
    minTeamSize?: number;
    maxTeamSize?: number;
    allowIndividual?: boolean;
  };
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CheckoutEvent | null;
}

export default function CheckoutModal({ isOpen, onClose, event }: CheckoutModalProps) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTickets, setHasTickets] = useState(false);
  const [userTickets, setUserTickets] = useState<TicketData[]>([]);
  const [checkingTickets, setCheckingTickets] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registrationSuccessData, setRegistrationSuccessData] = useState<{
    orderId: string;
    ticketId: string;
    quantity: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    teamName?: string;
    eventTitle: string;
    eventDate?: string;
    eventVenue?: string;
    ticketPrice?: number;
    totalAmount: number;
    ticketData?: TicketData;
    tickets?: TicketData[];
  } | null>(null);
  const [downloadingPass, setDownloadingPass] = useState(false);
  const [downloadingPassId, setDownloadingPassId] = useState<string | null>(null);
  const [downloadingAllPasses, setDownloadingAllPasses] = useState(false);
  const [downloadingExistingTicketId, setDownloadingExistingTicketId] = useState<string | null>(null);
  const [downloadingAllExisting, setDownloadingAllExisting] = useState(false);

  // Check if user already has tickets for this event
  useEffect(() => {
    const checkUserTickets = async () => {
      if (!user || !event?.id || !isOpen) return;

      setCheckingTickets(true);
      try {
        const hasUserTickets = await hasUserTicketsForEvent(event.id);
        setHasTickets(hasUserTickets);

        if (hasUserTickets) {
          const tickets = await getUserTicketsForEvent(event.id);
          setUserTickets(tickets);
        }
      } catch (error) {
        console.error('Error checking user tickets:', error);
      } finally {
        setCheckingTickets(false);
      }
    };

    checkUserTickets();
  }, [user, event?.id, isOpen]);

  if (!event) return null;

  const remainingTickets = getRemainingTickets(event as unknown as Partial<PaymentEvent>);
  const isTeamEvent = event.isTeamEvent;

  const handleProceedToPay = async (registrationData: {
    teamName: string;
    teamSize: number;
    members: Array<{
      name: string;
      email: string;
      phone: string;
      rollNumber?: string;
      year?: string;
      section?: string;
      customAnswers?: Record<string, string>;
      [key: string]: any;
    }>;
    totalAmount: number;
    college?: string;
    department?: string;
    numberOfEventDays?: number;
    passId?: string;
    passName?: string;
    passPrice?: number;
    badgeText?: string;
  }) => {
    setIsProcessing(true);
    setError(null);
    setPaymentError(null);
    setShowTeamModal(false);

    try {
      // Use the first member's phone number or fallback to a default
      const customerPhone = registrationData.members[0]?.phone?.replace(/\s+/g, '') || '9999999999';
      const customerEmail = registrationData.members[0]?.email || user?.email || 'user@example.com';
      const customerName = registrationData.members[0]?.name || user?.displayName || 'User';

      // Calculate effective ticket quantity so all registered members receive individual tickets
      const memberCount = registrationData.members?.length || 0;
      const effectiveQuantity = Math.max(registrationData.teamSize || 1, memberCount || 1);

      // Create payment order with complete team/registration data including pass details
      const orderResponse = await createPaymentOrder({
        eventId: event.id,
        quantity: effectiveQuantity,
        teamData: {
          teamName: registrationData.teamName,
          members: registrationData.members,
          college: registrationData.college,
          department: registrationData.department,
          numberOfEventDays: registrationData.numberOfEventDays,
          passId: registrationData.passId,
          passName: registrationData.passName,
          passPrice: registrationData.passPrice,
          badgeText: registrationData.badgeText,
        },
        customerDetails: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone
        }
      });

      if (orderResponse.success) {
        console.log('Payment order created:', orderResponse);

        // Check if this is a free event
        if (orderResponse.totalAmount === 0) {
          console.log('Free event registration completed:', orderResponse);

          const rawTicketList = (orderResponse as any).ticketList || (orderResponse as any).tickets;
          const allTickets: TicketData[] = [];

          if (Array.isArray(rawTicketList) && rawTicketList.length > 0) {
            rawTicketList.forEach((rawTkt: any, idx: number) => {
              const tId = rawTkt.ticketId || rawTkt.id || `TF${Math.floor(1000 + Math.random() * 9000)}`;
              const member = registrationData.members[idx] || registrationData.members[0];
              const mName = rawTkt.customerDetails?.name || member?.name || (idx === 0 ? customerName : `Member ${idx + 1}`);
              const mEmail = rawTkt.customerDetails?.email || member?.email || customerEmail;
              const mPhone = rawTkt.customerDetails?.phone || member?.phone || customerPhone;

              allTickets.push({
                id: tId,
                ticketId: tId,
                orderId: orderResponse.orderId,
                eventId: event.id,
                userId: rawTkt.userId || (idx === 0 ? user?.uid || '' : ''),
                qrCodeData: rawTkt.qrCodeData || tId,
                isCheckedIn: false,
                checkedInAt: null,
                dayTickets: rawTkt.dayTickets,
                createdAt: new Date().toISOString(),
                ticketNumber: idx + 1,
                totalTickets: Math.max(effectiveQuantity, rawTicketList.length),
                price: 0,
                ticketType: 'General Admission',
                customerDetails: {
                  name: mName,
                  email: mEmail,
                  phone: mPhone
                },
                teamInfo: {
                  teamName: registrationData.teamName,
                  memberName: mName,
                  memberEmail: mEmail,
                  memberPhone: mPhone,
                  memberRollNumber: member?.rollNumber || '',
                  memberYear: member?.year || '',
                  memberSchool: member?.school || '',
                  memberCollege: registrationData.college || '',
                  memberDepartment: registrationData.department || '',
                  gender: (member as any)?.gender || '',
                  tshirtSize: (member as any)?.tshirtSize || '',
                  customAnswers: rawTkt.customAnswers || member?.customAnswers,
                  registrationAnswers: rawTkt.registrationAnswers,
                  isTeamEvent: Boolean(isTeamEvent)
                } as any,
                customAnswers: rawTkt.customAnswers || member?.customAnswers,
                registrationAnswers: rawTkt.registrationAnswers,
                fieldConfigs: rawTkt.fieldConfigs || (event as any).registrationFields?.fields,
                eventData: {
                  title: event.title,
                  dateTime: event.dateTime,
                  venue: event.venue,
                  registrationFields: event.registrationFields
                }
              });
            });
          } else {
            const countToCreate = effectiveQuantity;
            for (let idx = 0; idx < countToCreate; idx++) {
              const tId = `TF${Math.floor(1000 + Math.random() * 9000)}`;
              const member = registrationData.members[idx] || registrationData.members[0];
              const mName = member?.name || (idx === 0 ? customerName : `Member ${idx + 1}`);
              const mEmail = member?.email || customerEmail;
              const mPhone = member?.phone || customerPhone;

              allTickets.push({
                id: tId,
                ticketId: tId,
                orderId: orderResponse.orderId,
                eventId: event.id,
                userId: idx === 0 ? user?.uid || '' : '',
                qrCodeData: tId,
                isCheckedIn: false,
                checkedInAt: null,
                createdAt: new Date().toISOString(),
                ticketNumber: idx + 1,
                totalTickets: countToCreate,
                price: 0,
                ticketType: 'General Admission',
                customerDetails: {
                  name: mName,
                  email: mEmail,
                  phone: mPhone
                },
                teamInfo: {
                  teamName: registrationData.teamName,
                  memberName: mName,
                  memberEmail: mEmail,
                  memberPhone: mPhone,
                  memberRollNumber: member?.rollNumber || '',
                  memberYear: member?.year || '',
                  memberSchool: member?.school || '',
                  memberCollege: registrationData.college || '',
                  memberDepartment: registrationData.department || '',
                  customAnswers: member?.customAnswers,
                  isTeamEvent: Boolean(isTeamEvent)
                } as any,
                customAnswers: member?.customAnswers,
                fieldConfigs: (event as any).registrationFields?.fields,
                eventData: {
                  title: event.title,
                  dateTime: event.dateTime,
                  venue: event.venue,
                  registrationFields: event.registrationFields
                }
              });
            }
          }

          const primaryTicket = allTickets[0];
          const ticketId = primaryTicket?.ticketId || `TF${Math.floor(1000 + Math.random() * 9000)}`;

          setRegistrationSuccessData({
            orderId: orderResponse.orderId,
            ticketId: ticketId,
            quantity: allTickets.length,
            customerName,
            customerEmail,
            customerPhone,
            teamName: registrationData.teamName,
            eventTitle: event.title,
            eventDate: event.dateTime?.startDate,
            eventVenue: typeof event.venue === 'string' ? event.venue : (event.venue?.name || 'Main Campus Venue'),
            ticketPrice: 0,
            totalAmount: 0,
            ticketData: primaryTicket,
            tickets: allTickets
          });
        } else {
          // For paid events, initialize Razorpay payment popup
          if (orderResponse.razorpayOrderId) {
            const keyId = orderResponse.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
            if (!keyId) {
              throw new Error('Razorpay public key is missing from configuration');
            }

            await initializeRazorpayPayment({
              keyId,
              orderId: orderResponse.orderId,
              razorpayOrderId: orderResponse.razorpayOrderId,
              amount: orderResponse.amount || Math.round(orderResponse.totalAmount * 100),
              currency: orderResponse.currency || 'INR',
              eventName: event.title || 'Event Ticket Booking',
              customerName,
              customerEmail,
              customerPhone,
              onSuccess: async (paymentData) => {
                try {
                  setIsProcessing(true);
                  const idToken = await user?.getIdToken();
                  const verifyRes = await fetch('/api/payments/verify', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({
                      orderId: orderResponse.orderId,
                      razorpayPaymentId: paymentData.razorpay_payment_id,
                      razorpayOrderId: paymentData.razorpay_order_id,
                      razorpaySignature: paymentData.razorpay_signature
                    })
                  });

                  if (!verifyRes.ok) {
                    const errData = await verifyRes.json();
                    throw new Error(errData.error || 'Payment verification failed');
                  }

                  onClose();
                  window.location.href = `/order/success?order_id=${orderResponse.orderId}`;
                } catch (verifyError) {
                  console.error('Payment verification error:', verifyError);
                  const errMsg = verifyError instanceof Error ? verifyError.message : 'Payment verification failed';
                  setError(errMsg);
                  setPaymentError(errMsg);
                  setIsProcessing(false);
                }
              },
              onError: (paymentError) => {
                console.error('Razorpay payment error:', paymentError);
                const errMsg = paymentError.message || 'Payment failed or was cancelled.';
                setError(errMsg);
                setPaymentError(errMsg);
                setIsProcessing(false);
              }
            });
          } else {
            const err = 'Payment order could not be created with Razorpay. Please try again.';
            setError(err);
            setPaymentError(err);
          }
        }
      } else {
        const err = orderResponse.error || 'Failed to create payment order';
        setError(err);
        setPaymentError(err);
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errMsg = error instanceof Error ? error.message : 'Payment failed. Please try again.';
      setError(errMsg);
      setPaymentError(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Show sold out state
  if (isSoldOut) {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" data-lenis-prevent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
            >
              {/* Corner decorations */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--gold)]" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--gold)]" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--gold)]" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--gold)]" />

              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mx-auto mb-6">
                  <X className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <h2 className="text-xl font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                  Event Sold Out
                </h2>
                <p className="text-[var(--fg-muted)] mb-8">
                  Sorry, all tickets for this event have been sold. Join our waitlist to be notified if spots become available.
                </p>
                <button
                  onClick={onClose}
                  className="btn-primary w-full"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // If ticket registration succeeded, render the curved luxury ticket status pop-up box (NOT a rectangle)
  if (registrationSuccessData) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" data-lenis-prevent>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => {
              setRegistrationSuccessData(null);
              onClose();
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-gradient-to-br from-[#24050a] via-[#140205] to-[#20040a] border-2 border-yellow-400 rounded-[36px] sm:rounded-[48px] shadow-[0_0_60px_rgba(220,38,38,0.5)] p-6 sm:p-8 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cutout side notches giving authentic ticket stub shape (NOT a plain rectangle) */}
            <div className="absolute top-1/2 -left-6 -translate-y-1/2 w-12 h-12 rounded-full bg-[#050102] border-2 border-yellow-400 z-20 shadow-inner" />
            <div className="absolute top-1/2 -right-6 -translate-y-1/2 w-12 h-12 rounded-full bg-[#050102] border-2 border-yellow-400 z-20 shadow-inner" />

            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={() => {
                setRegistrationSuccessData(null);
                onClose();
              }}
              className="absolute top-5 right-6 w-9 h-9 rounded-full bg-red-950/70 border border-yellow-400/40 text-yellow-300 hover:text-white hover:border-yellow-400 flex items-center justify-center transition-all z-30"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header & Status Badge */}
            <div className="text-center relative z-10 pt-1">
              <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-yellow-400 uppercase mb-2">
                <span>✦</span> FESTORA PASS CREDENTIAL <span>✦</span>
              </div>

              <div className="my-2 flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/15 border border-yellow-400 text-yellow-300 text-xs font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(250,204,21,0.3)]">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                  {registrationSuccessData.tickets && registrationSuccessData.tickets.length > 1
                    ? `● ${registrationSuccessData.tickets.length} TEAM PASSES CONFIRMED • ACTIVE`
                    : '● REGISTRATION CONFIRMED • ACTIVE'}
                </div>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white font-[family-name:var(--font-marcellus)] uppercase tracking-wide mt-3 line-clamp-2">
                {registrationSuccessData.eventTitle}
              </h3>
            </div>

            {/* Perforated dashed divider line spanning between notches */}
            <div className="relative my-6 z-10">
              <div className="w-full border-t-2 border-dashed border-yellow-400/40" />
            </div>

            {/* Ticket Information Cards Grid (Crimson & Yellow) */}
            <div className="space-y-3 relative z-10">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#120205]/90 border border-yellow-400/30 rounded-2xl p-3.5 shadow-sm">
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block mb-1">
                    👤 Attendee Name
                  </span>
                  <p className="text-sm font-bold text-white truncate">
                    {registrationSuccessData.customerName}
                  </p>
                  {registrationSuccessData.teamName ? (
                    <p className="text-[11px] text-red-200 truncate">
                      Team: {registrationSuccessData.teamName}
                    </p>
                  ) : (
                    <p className="text-[11px] text-red-200/80 truncate">
                      {registrationSuccessData.customerEmail}
                    </p>
                  )}
                </div>

                <div className="bg-[#120205]/90 border border-yellow-400/30 rounded-2xl p-3.5 shadow-sm">
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block mb-1">
                    🎟️ Ticket Pass ID
                  </span>
                  <p className="text-sm font-mono font-bold text-yellow-300 truncate">
                    {registrationSuccessData.ticketId}
                  </p>
                  <p className="text-[11px] text-red-200">
                    {registrationSuccessData.quantity} {registrationSuccessData.quantity === 1 ? 'Pass' : 'Passes'} • FREE ADMISSION
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#120205]/90 border border-yellow-400/30 rounded-2xl p-3.5 shadow-sm">
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block mb-1">
                    📅 Date & Time
                  </span>
                  <p className="text-xs font-semibold text-white">
                    {registrationSuccessData.eventDate
                      ? new Date(registrationSuccessData.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Date TBA'}
                  </p>
                  <p className="text-[11px] text-red-200/70">
                    Admission on entry
                  </p>
                </div>

                <div className="bg-[#120205]/90 border border-yellow-400/30 rounded-2xl p-3.5 shadow-sm">
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest block mb-1">
                    📍 Location & Venue
                  </span>
                  <p className="text-xs font-semibold text-white truncate">
                    {registrationSuccessData.eventVenue}
                  </p>
                  <p className="text-[11px] text-red-200/70">
                    Main Gate / Campus
                  </p>
                </div>
              </div>
            </div>

            {/* Actions in Crimson Red & Yellow */}
            <div className="mt-6 space-y-3 relative z-10">
              {registrationSuccessData.tickets && registrationSuccessData.tickets.length > 1 ? (
                <>
                  {/* Download All Passes Button */}
                  <button
                    onClick={async () => {
                      if (!registrationSuccessData?.tickets) return;
                      try {
                        setDownloadingAllPasses(true);
                        await downloadAllTickets(registrationSuccessData.tickets);
                      } catch (err) {
                        console.error('Error downloading all team passes:', err);
                      } finally {
                        setDownloadingAllPasses(false);
                      }
                    }}
                    disabled={downloadingAllPasses}
                    className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#990000] via-[#dc2626] to-[#b91c1c] text-white font-bold uppercase tracking-widest text-xs border-2 border-yellow-400 shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:brightness-110 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {downloadingAllPasses ? (
                      <>
                        <Spinner inline />
                        <span>Generating All {registrationSuccessData.tickets.length} Passes (PNG)...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-yellow-300" />
                        <span>Download All Team Passes ({registrationSuccessData.tickets.length} PNGs)</span>
                      </>
                    )}
                  </button>

                  {/* Individual Team Member Passes List */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
                        Team Member Entry Passes ({registrationSuccessData.tickets.length})
                      </span>
                      <span className="text-[10px] text-red-200/70">
                        Download each pass separately
                      </span>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {registrationSuccessData.tickets.map((tkt, idx) => {
                        const tId = tkt.ticketId || tkt.id;
                        const memberName = tkt.teamInfo?.memberName || tkt.customerDetails?.name || `Member ${idx + 1}`;
                        const isDownloadingThis = downloadingPassId === tId;
                        return (
                          <div
                            key={tId}
                            className="flex items-center justify-between p-2.5 bg-[#120205]/95 border border-yellow-400/30 rounded-xl"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
                                  #{idx + 1}
                                </span>
                                <p className="text-xs font-bold text-white truncate">
                                  {memberName}
                                </p>
                              </div>
                              <p className="text-[10px] text-yellow-300/80 font-mono truncate">
                                {tId}
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  setDownloadingPassId(tId);
                                  await downloadTicketImage(tkt);
                                } catch (err) {
                                  console.error('Error downloading ticket pass:', err);
                                } finally {
                                  setDownloadingPassId(null);
                                }
                              }}
                              disabled={isDownloadingThis}
                              className="px-3 py-1.5 rounded-lg bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 border border-yellow-400/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
                            >
                              {isDownloadingThis ? (
                                <Spinner inline />
                              ) : (
                                <Download className="w-3 h-3 text-yellow-300" />
                              )}
                              <span>Pass PNG</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <button
                  onClick={async () => {
                    if (!registrationSuccessData?.ticketData) return;
                    try {
                      setDownloadingPass(true);
                      await downloadTicketImage(registrationSuccessData.ticketData);
                    } catch (err) {
                      console.error('Error downloading ticket pass:', err);
                    } finally {
                      setDownloadingPass(false);
                    }
                  }}
                  disabled={downloadingPass}
                  className="w-full py-3.5 px-6 rounded-full bg-gradient-to-r from-[#990000] via-[#dc2626] to-[#b91c1c] text-white font-bold uppercase tracking-widest text-xs border-2 border-yellow-400 shadow-[0_0_25px_rgba(220,38,38,0.6)] hover:brightness-110 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {downloadingPass ? (
                    <>
                      <Spinner inline />
                      <span>Generating Crimson Pass (PNG)...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-yellow-300" />
                      <span>Download Ticket Pass (PNG)</span>
                    </>
                  )}
                </button>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setRegistrationSuccessData(null);
                    onClose();
                    window.location.href = '/dashboard/tickets';
                  }}
                  className="flex-1 py-3 px-4 rounded-full bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 font-bold uppercase tracking-widest text-xs border border-yellow-400/50 transition-all flex items-center justify-center gap-2"
                >
                  <Ticket className="w-4 h-4" />
                  <span>My Tickets</span>
                </button>
                <button
                  onClick={() => {
                    setRegistrationSuccessData(null);
                    onClose();
                  }}
                  className="px-6 py-3 rounded-full bg-[#120205] hover:bg-[#20040a] text-red-200 font-bold uppercase tracking-widest text-xs border border-yellow-400/30 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // If user is authenticated and does not have existing tickets, directly open the registration details form
  if (!checkingTickets && !hasTickets && user) {
    return (
      <>
        <TeamRegistrationModal
          isOpen={isOpen}
          onClose={() => {
            setPaymentError(null);
            setError(null);
            onClose();
          }}
          event={{
            ...event,
            ticketPrice: event.ticketPrice ?? event.price ?? 0,
            price: event.price ?? event.ticketPrice ?? 0,
            isMultiDay: event.isMultiDay,
            eventDays: event.eventDays,
            ticketPasses: (event as any).ticketPasses
          } as Parameters<typeof TeamRegistrationModal>[0]['event']}
          onProceed={handleProceedToPay}
          paymentError={paymentError}
          isProcessing={isProcessing}
          onClearPaymentError={() => setPaymentError(null)}
        />
        <SuccessNotification
          open={!!successMessage}
          title="Registration Successful!"
          message={successMessage || ''}
          onClose={() => setSuccessMessage(null)}
          autoCloseMs={0}
        />
      </>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" data-lenis-prevent>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
          >
            {/* Corner decorations */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[var(--gold)] z-10" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[var(--gold)] z-10" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[var(--gold)] z-10" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[var(--gold)] z-10" />

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
              <h2 className="text-xl font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                {hasTickets ? 'Your Tickets' : 'Get Tickets'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Event Info */}
            <div className="p-6 border-b border-[var(--border-subtle)]">
              <h3 className="font-bold text-[var(--fg)] mb-2 font-[family-name:var(--font-marcellus)] uppercase tracking-wide">
                {event.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-[var(--fg-muted)]">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-[var(--gold)]" />
                  {event.dateTime?.startDate ? new Date(event.dateTime.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBD'}
                </div>
                <div>
                  {typeof event.venue === 'string' ? event.venue : (event.venue?.name || 'Online Event')}
                </div>
              </div>

              {remainingTickets <= 10 && remainingTickets > 0 && (
                <div className="mt-3 px-3 py-1 bg-[var(--gold)]/10 text-[var(--gold)] text-xs border border-[var(--gold)]/20 inline-block uppercase tracking-wider font-bold">
                  Only {remainingTickets} tickets left
                </div>
              )}
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {checkingTickets ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner inline />
                  <span className="ml-3 text-[var(--fg-muted)]">Checking your tickets...</span>
                </div>
              ) : hasTickets ? (
                /* Show existing tickets */
                <>
                  <div className="space-y-4">
                    <div className="p-4 bg-[var(--gold)]/10 border border-[var(--gold)]/20">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-[var(--gold)]"></div>
                        <div>
                          <p className="font-bold text-[var(--gold)] uppercase tracking-wide text-sm">
                            You&apos;re registered for this event!
                          </p>
                          <p className="text-[var(--gold)]/80 text-sm">
                            You have {userTickets.length} ticket{userTickets.length > 1 ? 's' : ''} for this event
                          </p>
                        </div>
                      </div>
                    </div>

                    {userTickets.length > 1 && (
                      <button
                        onClick={async () => {
                          try {
                            setDownloadingAllExisting(true);
                            await downloadAllTickets(userTickets);
                          } catch (err) {
                            console.error('Error downloading all tickets:', err);
                          } finally {
                            setDownloadingAllExisting(false);
                          }
                        }}
                        disabled={downloadingAllExisting}
                        className="w-full py-2.5 px-4 bg-[var(--gold)]/10 hover:bg-[var(--gold)]/20 text-[var(--gold)] border border-[var(--gold)] uppercase tracking-widest text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {downloadingAllExisting ? (
                          <>
                            <Spinner inline />
                            <span>Downloading All ({userTickets.length})...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            <span>Download All Passes ({userTickets.length} PNGs)</span>
                          </>
                        )}
                      </button>
                    )}

                    {userTickets.map((ticket, index) => {
                      const tId = ticket.ticketId || ticket.id;
                      const attendee = ticket.teamInfo?.memberName || ticket.customerDetails?.name;
                      const isDownloading = downloadingExistingTicketId === tId;
                      return (
                        <div key={tId} className="p-4 border border-[var(--border-subtle)] bg-[var(--bg)]">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-bold text-[var(--fg)] uppercase tracking-wide text-sm">
                                {attendee ? `${attendee} (Pass #${index + 1})` : `Ticket #${index + 1}`}
                              </p>
                              {ticket.teamInfo?.teamName && (
                                <p className="text-xs text-[var(--gold)] mt-0.5">
                                  Team: {ticket.teamInfo.teamName}
                                </p>
                              )}
                              <p className="text-sm text-[var(--fg-muted)]">
                                {ticket.ticketType || 'General Admission'}
                              </p>
                              <p className="text-xs text-[var(--fg-muted)] mt-1 font-mono">
                                ID: {tId.substring(0, 12)}...
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[var(--fg)]">
                                {ticket.price ? formatCurrency(ticket.price) : 'FREE'}
                              </p>
                              <span className="inline-block px-2 py-1 text-xs bg-[var(--gold)]/10 text-[var(--gold)] border border-[var(--gold)]/20 uppercase tracking-wider font-bold">
                                {ticket.status || 'Active'}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                setDownloadingExistingTicketId(tId);
                                await downloadTicketImage(ticket);
                              } catch (err) {
                                console.error('Error downloading ticket pass:', err);
                              } finally {
                                setDownloadingExistingTicketId(null);
                              }
                            }}
                            disabled={isDownloading}
                            className="w-full py-2 px-3 bg-[var(--primary)] hover:bg-[var(--primary-light)] text-[var(--fg)] border border-[var(--primary)] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                          >
                            {isDownloading ? (
                              <Spinner inline />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            <span>Download Pass (PNG)</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="btn-ghost flex-1 h-12"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => window.location.href = '/dashboard/tickets'}
                      className="btn-primary flex-1 h-12"
                    >
                      View All Tickets
                    </button>
                  </div>
                </>
              ) : (
                /* Show sign-in prompt when not logged in */
                <>
                  <div className="text-center py-4 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)] flex items-center justify-center mx-auto text-[var(--gold)] mb-2">
                      <Users className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
                      Sign In Required
                    </h3>
                    <p className="text-[var(--fg-muted)] text-sm max-w-sm mx-auto leading-relaxed">
                      Please sign in or create an account to enter your registration details and complete your ticket booking.
                    </p>
                  </div>

                  {/* Security Info */}
                  <div className="flex items-center gap-3 p-4 bg-[var(--gold)]/10 border border-[var(--gold)]/20">
                    <Shield className="w-5 h-5 text-[var(--gold)] flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-bold text-[var(--gold)] uppercase tracking-wide text-xs">
                        Secure Registration
                      </p>
                      <p className="text-[var(--gold)]/80 text-xs">
                        {event.isPaid ? 'Protected by Cashfree with 256-bit SSL encryption' : 'Your data is protected with SSL encryption'}
                      </p>
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/20">
                      <p className="text-[var(--primary-light)] text-sm">
                        {error}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={onClose}
                      className="btn-ghost flex-1 h-12"
                    >
                      Cancel
                    </button>

                    <a
                      href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : `/events/${event.id}`)}`}
                      className="btn-primary flex-1 h-12 inline-flex items-center justify-center text-xs uppercase tracking-wider font-bold"
                    >
                      Sign In to Register
                    </a>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
