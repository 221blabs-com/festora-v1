/**
 * Order Success Page
 * Displayed after successful payment completion
 */

'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Mail, Calendar, MapPin, Download, ArrowRight, X, ClockIcon, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { getUserTickets } from '@/lib/payment';
import { useAuth } from '@/contexts/auth-context';
import { Spinner } from '@/components/ui/spinner';

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [phase, setPhase] = useState<'init' | 'waiting-auth' | 'confirming' | 'pending-payment' | 'processing' | 'completed' | 'tickets-lag' | 'failed'>('init');
  const [gatewayStatusState, setGatewayStatusState] = useState<string | null>(null);
  const [ticketLagTries, setTicketLagTries] = useState(0);
  const maxRetries = 15; // Try for up to 45 seconds (15 retries * 3 seconds each)

  const { user, loading: authLoading } = useAuth();

  // Replace old fetchOrderDetails logic with confirm+fetch pipeline
  const confirmAndLoad = async (attempt = 0) => {
    if (!orderId) return;
    if (attempt === 0) {
      setLoading(true);
      setError(null);
    }
    try {
      // Get auth token via firebase client (reuse getUserTickets path if user not ready)
      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setPhase('waiting-auth');
        setTimeout(() => confirmAndLoad(attempt + 1), 1500);
        return;
      }
      const token = await currentUser.getIdToken();
      setPhase('confirming');

      // Call confirm endpoint – idempotent & will process if paid
      const confirmResp = await fetch('/api/orders/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });

      const confirmData = await confirmResp.json();
      if (!confirmResp.ok) {
        console.error('Confirm error', confirmData);
        if (attempt < maxRetries) {
          setTimeout(() => confirmAndLoad(attempt + 1), 3000);
          return;
        }
        setError(confirmData.error || 'Failed to confirm payment');
        setLoading(false);
        return;
      }

      if (confirmData.status !== 'completed') {
        setGatewayStatusState(confirmData.gatewayStatus || confirmData.status);
        setPhase('pending-payment');
        // Still pending at gateway
        if (attempt < maxRetries) {
          setRetryCount(attempt + 1);
          setTimeout(() => confirmAndLoad(attempt + 1), 3000);
          return;
        }
        setError('Payment still pending. Please refresh later or check email.');
        setLoading(false);
        return;
      }

      // At this point order should be processed; fetch tickets
      const tickets = await getUserTickets();
      const orderTickets = tickets.filter(t => t.orderId === orderId);
      if (orderTickets.length === 0) {
        // Race condition: payment confirmed but tickets not yet visible
        setPhase('tickets-lag');
        setTicketLagTries(prev => prev + 1);
        // Edge: processing race; retry a couple extra quick attempts
        if (attempt < maxRetries + 3) {
          setTimeout(() => confirmAndLoad(attempt + 1), 1500);
          return;
        }
        setError('Order completed but tickets not available yet. Check email or dashboard.');
        setLoading(false);
        return;
      }

      setOrderDetails({
        tickets: orderTickets,
        event: orderTickets[0].eventData,
        quantity: orderTickets.length,
        orderId
      });
      setPhase('completed');
      setLoading(false);

    } catch (e: any) {
      console.error('Confirm flow error', e);
      if (attempt < maxRetries) {
        setPhase('confirming');
        setTimeout(() => confirmAndLoad(attempt + 1), 3000);
        return;
      }
      setError('Unexpected error confirming order. Please check email or dashboard.');
      setPhase('failed');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId && !authLoading) {
      confirmAndLoad(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, authLoading]);

  // Auto-redirect to dashboard after showing success for 5 seconds (increased from 3)
  useEffect(() => {
    if (orderDetails && !loading && !error) {
      const timer = setTimeout(() => {
        window.location.href = '/dashboard/tickets';
      }, 5000); // Increased to 5 seconds to give user more time to see success

      return () => clearTimeout(timer);
    }
  }, [orderDetails, loading, error]);

  // Progress calculation for all loading phases
  const progressPercent = Math.min(((retryCount + 1) / maxRetries) * 100, 95);

  if (loading) {
    // Render based on phase instead of generic loader
    if (phase === 'pending-payment') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 text-center font-[family-name:var(--font-josefin)] relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none" />
          <div className="relative z-10 max-w-md mx-auto">
            <div className="flex justify-center mb-8">
              <Spinner />
            </div>

            <h2 className="text-xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">Waiting for Payment Confirmation</h2>
            <p className="text-[var(--fg-muted)] text-sm mb-4">We&apos;re securely confirming the payment with the bank / gateway.</p>

            {/* Progress bar */}
            <div className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] h-3 mb-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--gold)] transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-[var(--fg-muted)] mb-6 uppercase tracking-wider">
              Status: <span className="text-[var(--gold)]">{gatewayStatusState || 'PENDING'}</span> • Attempt {retryCount + 1}/{maxRetries}
            </p>

            {/* Warning */}
            <div className="p-4 bg-[var(--primary)]/10 border border-[var(--primary)]/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--fg)] text-left leading-relaxed">
                <span className="font-bold uppercase tracking-wider text-[var(--primary)]">Do not go back or refresh</span><br/>
                Your tickets are being processed. You will be redirected automatically once confirmed.
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (phase === 'tickets-lag') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 text-center font-[family-name:var(--font-josefin)] relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none" />
          <div className="relative z-10 max-w-md mx-auto">
            <div className="flex justify-center mb-8">
              <Spinner />
            </div>

            <h2 className="text-xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">Generating Your Tickets…</h2>
            <p className="text-[var(--fg-muted)] text-sm mb-4">Payment confirmed! Finalizing your ticket records.</p>

            {/* Progress bar */}
            <div className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] h-3 mb-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--gold)] to-[var(--primary)] transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(70 + ticketLagTries * 10, 95)}%` }}
              />
            </div>
            <p className="text-xs text-[var(--fg-muted)] mb-6 uppercase tracking-wider">
              Almost there… <span className="text-[var(--gold)]">(step {ticketLagTries})</span>
            </p>

            {/* Warning */}
            <div className="p-4 bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--gold)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--fg)] text-left leading-relaxed">
                <span className="font-bold uppercase tracking-wider text-[var(--gold)]">Do not go back or refresh</span><br/>
                Your tickets are being generated. You&apos;ll also receive them by email.
              </p>
            </div>
          </div>
        </div>
      );
    }
    if (phase === 'waiting-auth' || phase === 'confirming' || phase === 'init') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 text-center font-[family-name:var(--font-josefin)] relative overflow-hidden">
          <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none" />
          <div className="relative z-10 max-w-md mx-auto">
            <div className="flex justify-center mb-8">
              <Spinner />
            </div>

            <h2 className="text-lg font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">Finalizing Your Order…</h2>
            <p className="text-[var(--fg-muted)] text-sm mb-6">Just a moment while we confirm everything.</p>

            {/* Progress bar */}
            <div className="w-full bg-[var(--bg-card)] border border-[var(--border-subtle)] h-2 overflow-hidden">
              <div className="h-full bg-[var(--primary)] animate-pulse w-1/3" />
            </div>

            {/* Warning */}
            <div className="mt-6 p-3 bg-[var(--primary)]/5 border border-[var(--border-subtle)] flex items-center gap-2 justify-center">
              <AlertCircle className="w-4 h-4 text-[var(--primary)]" />
              <p className="text-[10px] text-[var(--fg-muted)] uppercase tracking-wider font-bold">Please do not go back or refresh this page</p>
            </div>
          </div>
        </div>
      );
    }
  }

  if (error || phase === 'failed') {
    const isHardFailure = phase === 'failed';
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 font-[family-name:var(--font-josefin)] relative overflow-hidden">
        <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none" />
        <div className="relative z-10 max-w-md mx-auto text-center">
          <div className={`w-20 h-20 border-2 rotate-45 flex items-center justify-center mx-auto mb-8 ${isHardFailure ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--gold)] bg-[var(--gold)]/10'}`}>
            {isHardFailure ? <X className="w-8 h-8 text-[var(--primary)] -rotate-45" /> : <ClockIcon className="w-8 h-8 text-[var(--gold)] -rotate-45" />}
          </div>
          <h1 className="text-2xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
            {isHardFailure ? 'Unable to Confirm Order' : 'Still Processing'}
          </h1>
          <p className="text-[var(--fg-muted)] mb-8 text-sm">
            {isHardFailure ? (error || 'An unexpected issue occurred while confirming your payment.') : 'Your payment hasn\'t been fully confirmed yet. This sometimes takes a little longer. You will get an email as soon as tickets are ready.'}
          </p>
          <div className="space-y-3">
            <Link href="/dashboard/tickets" className="btn-primary w-full justify-center gap-2">View My Tickets</Link>
            <button onClick={() => { setRetryCount(0); setPhase('init'); confirmAndLoad(0); }} className="btn-ghost w-full">Retry Now</button>
          </div>
          <p className="mt-8 text-xs text-[var(--fg-muted)] uppercase tracking-wider">Need help? Contact support with Order ID <span className="font-mono text-[var(--gold)]">{orderId}</span>.</p>
        </div>
      </div>
    );
  }

  const { tickets, event, quantity } = orderDetails;

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed"></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-2xl mx-auto"
        >
          {/* Success Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 border border-[var(--primary)] rotate-45 flex items-center justify-center mx-auto mb-10 bg-[var(--bg-card)]"
            >
              <CheckCircle className="w-12 h-12 text-[var(--primary)] -rotate-45" />
            </motion.div>

            <h1 className="text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
              Payment Successful!
            </h1>
            <p className="text-[var(--fg-muted)]">
              Your tickets have been confirmed and sent to your email
            </p>
          </div>

          {/* Order Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 relative mb-8 corner-bracket"
          >

            <div className="border-b border-[var(--border-subtle)] pb-6 mb-6">
              <h2 className="text-xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-2 uppercase tracking-wide">
                Order Confirmation
              </h2>
              <p className="text-[var(--fg-muted)] text-sm font-mono opacity-70">
                Order ID: {orderId}
              </p>
            </div>

            <div>
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 border border-[var(--gold)] rotate-45 flex items-center justify-center flex-shrink-0 bg-[var(--bg)]">
                  <Calendar className="w-8 h-8 text-[var(--gold)] -rotate-45" />
                </div>
                <div className="flex-1 pt-2">
                  <h3 className="font-bold text-[var(--fg)] text-lg mb-2 uppercase tracking-wide">
                    {event.title}
                  </h3>
                  <div className="space-y-1 text-sm text-[var(--fg-muted)]">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-[var(--primary)]" />
                      {new Date(event.dateTime.startDate).toLocaleDateString('en-GB', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[var(--primary)]" />
                      {event.venue?.name || 'Online Event'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 border border-[var(--border-subtle)] bg-[var(--bg)]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--fg-muted)] mb-1">Tickets</p>
                  <p className="font-bold text-[var(--fg)]">
                    {quantity} <span className="text-[var(--primary)]">ticket{quantity > 1 ? 's' : ''}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--fg-muted)] mb-1">Status</p>
                  <p className="font-bold text-green-500 uppercase tracking-widest text-xs border border-green-500/30 bg-green-500/10 inline-block px-2 py-1">
                    Confirmed
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 relative mb-8"
          >
            <h3 className="text-xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-6 uppercase tracking-wide">
              What&apos;s Next?
            </h3>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 border border-[var(--primary)] rotate-45 flex items-center justify-center flex-shrink-0 bg-[var(--bg)] mt-1">
                  <Mail className="w-4 h-4 text-[var(--primary)] -rotate-45" />
                </div>
                <div>
                  <p className="font-bold text-[var(--fg)] uppercase tracking-wide text-xs mb-1">
                    Check Your Email
                  </p>
                  <p className="text-sm text-[var(--fg-muted)]">
                    Your tickets with QR codes have been sent to your email address
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="w-8 h-8 border border-[var(--gold)] rotate-45 flex items-center justify-center flex-shrink-0 bg-[var(--bg)] mt-1">
                  <Download className="w-4 h-4 text-[var(--gold)] -rotate-45" />
                </div>
                <div>
                  <p className="font-bold text-[var(--fg)] uppercase tracking-wide text-xs mb-1">
                    Save Your Tickets
                  </p>
                  <p className="text-sm text-[var(--fg-muted)]">
                    Download or screenshot your QR codes for easy access at the event
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                 <div className="w-8 h-8 border border-[var(--primary)] rotate-45 flex items-center justify-center flex-shrink-0 bg-[var(--bg)] mt-1">
                  <CheckCircle className="w-4 h-4 text-[var(--primary)] -rotate-45" />
                </div>
                <div>
                  <p className="font-bold text-[var(--fg)] uppercase tracking-wide text-xs mb-1">
                    Arrive Early
                  </p>
                  <p className="text-sm text-[var(--fg-muted)]">
                    Come 15 minutes early for smooth check-in with your QR code
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Link
              href="/dashboard/tickets"
              className="flex-1"
            >
               <button className="w-full py-4 bg-[var(--primary)] text-[var(--fg)] border border-[var(--primary)] hover:bg-[var(--primary-light)] transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_var(--primary-glow)]">
                 <Download className="w-4 h-4" />
                 View My Tickets
               </button>
            </Link>

            <Link
              href="/events"
              className="flex-1"
            >
               <button className="w-full py-4 bg-transparent text-[var(--fg)] border border-[var(--border-subtle)] hover:border-[var(--fg)] hover:text-[var(--bg)] transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                 Browse More Events
                 <ArrowRight className="w-4 h-4" />
               </button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderSuccessContent />
    </Suspense>
  );
}
