'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, Users, ShoppingCart, Clock } from 'lucide-react';

interface TicketTier {
  id: string;
  name: string;
  price: number;
  limit: number;
  sold: number;
  description: string;
  salesStart: string;
  salesEnd: string;
}

interface TicketSelectorProps {
  ticketTiers: TicketTier[];
  selectedTier: TicketTier;
  onTierChange: (tier: TicketTier) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  totalPrice: number;
  soldCount: number;
  capacity: number;
  isEventFull: boolean;
  availableTickets: number;
}

export function TicketSelector({
  ticketTiers,
  selectedTier,
  onTierChange,
  quantity,
  onQuantityChange,
  totalPrice,
  soldCount,
  capacity,
  isEventFull,
  availableTickets,
}: TicketSelectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuyTicket = async () => {
    setIsProcessing(true);
    setTimeout(() => {
      console.log('Creating order...', {
        tierId: selectedTier.id,
        quantity,
        totalPrice,
      });
      setIsProcessing(false);
    }, 2000);
  };

  const canPurchase = !isEventFull && availableTickets >= quantity && quantity > 0;
  const progressPercentage = (soldCount / capacity) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="event-card p-6 sm:p-8"
    >
      <h3 className="text-lg sm:text-xl font-bold mb-4 text-[var(--fg)] font-[family-name:var(--font-marcellus)] uppercase tracking-wider">
        Get Your Tickets
      </h3>

      {/* Ticket Tiers */}
      <div className="space-y-3 mb-6">
        {ticketTiers && ticketTiers.length > 0 ? (
          ticketTiers.map((tier) => {
            const tierAvailable = tier.limit - tier.sold;
            const isTierSoldOut = tierAvailable <= 0;
            const isSelected = selectedTier?.id === tier.id;

            return (
              <button
                key={tier.id}
                onClick={() => !isTierSoldOut && onTierChange(tier)}
                disabled={isTierSoldOut}
                className={`w-full p-4 border text-left transition-all ${
                  isSelected
                    ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                    : 'border-[var(--border-subtle)] hover:border-[var(--gold)] bg-[var(--bg)]'
                } ${
                  isTierSoldOut
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-[var(--fg)] text-sm sm:text-base uppercase tracking-wide">
                    {tier.name}
                  </h4>
                  <div className="text-right">
                    {tier.price === 0 ? (
                      <span className="text-[var(--gold)] font-bold text-sm sm:text-base uppercase tracking-wider">Free</span>
                    ) : (
                      <span className="text-[var(--fg)] font-bold text-sm sm:text-base font-[family-name:var(--font-marcellus)]">
                        ₹{tier.price}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[var(--fg-muted)] mb-2 leading-tight">
                  {tier.description}
                </p>
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-[var(--fg-muted)]">
                    {isTierSoldOut ? 'Sold Out' : `${tierAvailable} remaining`}
                  </span>
                  <span className="text-[var(--fg-muted)]">
                    {tier.sold} / {tier.limit} sold
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <p className="text-[var(--fg-muted)] text-sm sm:text-base">
            No ticket tiers available.
          </p>
        )}
      </div>

      {/* Quantity Selector */}
      {!isEventFull && availableTickets > 0 && (
        <div className="mb-6">
          <label className="block text-xs font-bold mb-2 text-[var(--fg-muted)] uppercase tracking-wider">
            Quantity
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="p-2 border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--fg-muted)] hover:text-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="1"
              max={Math.min(availableTickets, 10)}
              value={quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                onQuantityChange(Math.max(1, Math.min(val, availableTickets)));
              }}
              className="w-16 text-center p-2 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--fg)] text-sm font-[family-name:var(--font-marcellus)] text-lg font-bold"
            />
            <button
              onClick={() => onQuantityChange(Math.min(availableTickets, quantity + 1, 10))}
              disabled={quantity >= Math.min(availableTickets, 10)}
              className="p-2 border border-[var(--border-subtle)] hover:border-[var(--primary)] text-[var(--fg-muted)] hover:text-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[var(--fg-muted)] mt-1">
            Max {Math.min(availableTickets, 10)} tickets per order
          </p>
        </div>
      )}

      {/* Price Breakdown */}
      <div className="border-t border-[var(--border-subtle)] pt-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-[var(--fg-muted)] text-sm">
            {quantity} x {selectedTier.name}
          </span>
          <span className="text-[var(--fg)] text-sm font-bold">
            ₹{selectedTier.price * quantity}
          </span>
        </div>
        <div className="flex justify-between items-center text-base sm:text-lg font-bold">
          <span className="text-[var(--fg)] uppercase tracking-wider text-sm">Total</span>
          <span className="text-[var(--primary)] font-[family-name:var(--font-marcellus)] text-2xl">₹{totalPrice}</span>
        </div>
      </div>

      {/* Buy Button */}
      {isEventFull ? (
        <button className="w-full py-3 px-6 bg-[var(--bg)] text-[var(--fg-muted)] border border-[var(--border-subtle)] cursor-not-allowed text-sm uppercase tracking-wider font-bold">
          Event Sold Out
        </button>
      ) : canPurchase ? (
        <button
          onClick={handleBuyTicket}
          disabled={isProcessing}
          className="btn-primary w-full py-3"
        >
          {isProcessing ? (
            'Processing...'
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Get Ticket
            </>
          )}
        </button>
      ) : (
        <button
          onClick={() => {/* Join waitlist logic */}}
          className="btn-ghost w-full py-3"
        >
          <Clock className="w-4 h-4 mr-2" />
          Join Waitlist
        </button>
      )}

      {/* Capacity Progress */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2 text-xs">
          <span className="text-[var(--fg-muted)] uppercase tracking-wider">Tickets Sold</span>
          <span className="text-[var(--fg)] font-bold">
            {soldCount} / {capacity}
          </span>
        </div>
        <div className="w-full bg-[var(--bg)] h-1.5 border border-[var(--border-subtle)]">
          <div
            className="bg-[var(--primary)] h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-[var(--fg-muted)] mt-1">
          {capacity - soldCount} tickets remaining
        </p>
      </div>
    </motion.div>
  );
}
