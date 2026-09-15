/**
 * Checkout Modal Component — Art Deco Theme
 * Handles ticket purchase flow with Cashfree integration and team registration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Clock, Users } from 'lucide-react';
import { createPaymentOrder, initializeRazorpayPayment, formatCurrency, areTicketsAvailable, getRemainingTickets, hasUserTicketsForEvent, getUserTicketsForEvent, TicketData } from '@/lib/payment';
import { db } from '@/lib/firebase';
import { Spinner } from '@/components/ui/spinner';
import type { Event as PaymentEvent } from '@/types/event';
import { useAuth } from '@/contexts/auth-context';
import { TeamRegistrationModal } from './team-registration-modal';

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
  const [showTeamModal, setShowTeamModal] = useState(false);

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

  // Fix sold out logic to handle missing or zero totalTickets
  const getEventCapacity = () => {
    return event.totalTickets || event.capacity || 0;
  };

  const eventCapacity = getEventCapacity();
  const ticketsSold = event.ticketsSold || 0;

  // Only consider sold out if there's a valid capacity and tickets sold meets/exceeds it
  const isSoldOut = eventCapacity > 0 && ticketsSold >= eventCapacity;

  const handlePurchase = () => {
    if (!user) {
      setError('Please log in to purchase tickets');
      return;
    }

    if (isSoldOut) {
      setError('Sorry, this event is sold out');
      return;
    }

    // Always show team registration modal first to collect user details
    setShowTeamModal(true);
  };

  const [paymentError, setPaymentError] = useState<string | null>(null);

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

      // Create payment order with complete team/registration data including AIGNITE fields
      const orderResponse = await createPaymentOrder({
        eventId: event.id,
        quantity: registrationData.teamSize,
        teamData: {
          teamName: registrationData.teamName,
          members: registrationData.members,
          college: registrationData.college,
          department: registrationData.department
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
          // For free events, no payment processing needed
          console.log('Free event registration completed:', orderResponse);

          // Show success message for free tickets and redirect
          alert(`Success! You've registered ${registrationData.teamSize} ${registrationData.teamSize === 1 ? 'ticket' : 'tickets'} for ${event.title}. Check your email for confirmation.`);

          // Close modal and redirect to dashboard after successful free registration
          onClose();

          // Redirect to dashboard/tickets after a short delay
          setTimeout(() => {
            window.location.href = '/dashboard/tickets';
          }, 2000);
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

  // If user is authenticated and does not have existing tickets, directly open the registration details form
  if (!checkingTickets && !hasTickets && user) {
    return (
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
          price: event.price ?? event.ticketPrice ?? 0
        } as Parameters<typeof TeamRegistrationModal>[0]['event']}
        onProceed={handleProceedToPay}
        paymentError={paymentError}
        isProcessing={isProcessing}
        onClearPaymentError={() => setPaymentError(null)}
      />
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

                    {userTickets.map((ticket, index) => (
                      <div key={ticket.id} className="p-4 border border-[var(--border-subtle)] bg-[var(--bg)]">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold text-[var(--fg)] uppercase tracking-wide text-sm">
                              Ticket #{index + 1}
                            </p>
                            <p className="text-sm text-[var(--fg-muted)]">
                              {ticket.ticketType || 'General Admission'}
                            </p>
                            <p className="text-xs text-[var(--fg-muted)] mt-1 font-mono">
                              ID: {ticket.id.substring(0, 8)}...
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
                      </div>
                    ))}
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
