/**
 * Order Failure Page
 * Displayed when payment fails or is cancelled
 */

'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { XCircle, RefreshCw, ArrowLeft, HelpCircle } from 'lucide-react';
import Link from 'next/link';

function OrderFailureContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get('order_id');
  const reason = searchParams?.get('reason') || 'Payment was cancelled or failed';

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-[family-name:var(--font-josefin)] relative overflow-hidden">
      {/* Pattern Overlay */}
      <div className="absolute inset-0 bg-pattern opacity-5 pointer-events-none fixed"></div>
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto"
        >
          {/* Failure Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-24 h-24 border border-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-10 bg-[var(--bg-card)]"
            >
              <XCircle className="w-12 h-12 text-[var(--primary)] " />
            </motion.div>

            <h1 className="text-4xl font-bold font-[family-name:var(--font-marcellus)] text-[var(--fg)] mb-4 uppercase tracking-wide">
              Payment Failed
            </h1>
            <p className="text-[var(--fg-muted)]">
              Your payment could not be processed
            </p>
          </div>

          {/* Error Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 relative mb-8"
          >
             
             
             
             <div className="flex items-start gap-4 p-4 bg-[var(--bg)] border border-[var(--primary)]/30">
               <XCircle className="w-5 h-5 text-[var(--primary)] mt-0.5 flex-shrink-0" />
               <div>
                 <h3 className="font-bold text-[var(--primary)] uppercase tracking-wide text-xs mb-1">Error Details</h3>
                 <p className="text-[var(--fg-muted)] text-sm">{reason}</p>
                 {orderId && <p className="text-[var(--fg-muted)] text-xs mt-2 opacity-70">Order ID: {orderId}</p>}
               </div>
             </div>
          </motion.div>
          
          <div className="flex flex-col gap-4">
             <Link href="/pricing" className="w-full">
                <button className="w-full py-4 bg-[var(--primary)] text-[var(--fg)] border border-[var(--primary)] hover:bg-[var(--primary-light)] transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                   <RefreshCw className="w-4 h-4" />
                   Try Again
                </button>
             </Link>
             
             <Link href="/dashboard" className="w-full">
                 <button className="w-full py-4 bg-transparent text-[var(--fg)] border border-[var(--border-subtle)] hover:border-[var(--fg)] transition-all font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Return to Dashboard
                 </button>
             </Link>
          </div>

        </motion.div>
      </div>
    </div>
  );
}

export default function OrderFailurePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrderFailureContent />
    </Suspense>
  );
}
