/**
 * @jest-environment node
 */
import { formatCurrency, calculateGatewayFee, calculateTotalWithGatewayFee, areTicketsAvailable, getRemainingTickets } from '../lib/payment';

describe('Payment Utilities', () => {
  describe('formatCurrency', () => {
    it('should format whole numbers correctly', () => {
      const result = formatCurrency(1000);
      expect(result).toMatch(/1,000/);
    });

    it('should format decimal numbers correctly', () => {
      const result = formatCurrency(1000.50);
      expect(result).toMatch(/1,000.50/);
    });

    it('should format zero correctly', () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/0/);
    });
  });

  describe('calculateGatewayFee', () => {
    it('returns 0 fee for free events', () => {
      expect(calculateGatewayFee(0)).toBe(0);
    });

    it('returns 0 for negative amounts', () => {
      expect(calculateGatewayFee(-100)).toBe(0);
    });

    it('calculates 3.5% gateway fee', () => {
      expect(calculateGatewayFee(1000)).toBe(35);
    });

    it('handles small amounts', () => {
      expect(calculateGatewayFee(10)).toBeCloseTo(0.35);
    });
  });

  describe('calculateTotalWithGatewayFee', () => {
    it('returns 0 for free events', () => {
      expect(calculateTotalWithGatewayFee(0)).toBe(0);
    });

    it('adds 3.5% to base amount', () => {
      expect(calculateTotalWithGatewayFee(1000)).toBe(1035);
    });
  });

  describe('areTicketsAvailable', () => {
    it('returns false for null/undefined event', () => {
      expect(areTicketsAvailable(null)).toBe(false);
      expect(areTicketsAvailable(undefined)).toBe(false);
    });

    it('returns true for free events with no capacity', () => {
      expect(areTicketsAvailable({ isPaid: false })).toBe(true);
    });

    it('returns false when sold out', () => {
      expect(areTicketsAvailable({ ticketsSold: 100, totalTickets: 100 })).toBe(false);
    });

    it('returns true when tickets remain', () => {
      expect(areTicketsAvailable({ ticketsSold: 50, totalTickets: 100 })).toBe(true);
    });
  });

  describe('getRemainingTickets', () => {
    it('returns 0 for null event', () => {
      expect(getRemainingTickets(null)).toBe(0);
    });

    it('calculates remaining correctly', () => {
      expect(getRemainingTickets({ ticketsSold: 30, totalTickets: 100 })).toBe(70);
    });

    it('never returns negative', () => {
      expect(getRemainingTickets({ ticketsSold: 150, totalTickets: 100 })).toBe(0);
    });
  });
});

