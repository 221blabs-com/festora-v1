/**
 * @jest-environment node
 */
import {
  formatCurrency,
  calculatePlatformFee,
  calculateTotalTicketAmount,
  calculateTotalAmount,
  calculateGatewayFee,
  calculateTotalWithGatewayFee,
  areTicketsAvailable,
  getRemainingTickets
} from '../lib/payment';

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

  describe('calculatePlatformFee - Fixed Rupee Rule (5 + number_of_people)', () => {
    it('returns 0 fee for free events', () => {
      expect(calculatePlatformFee(1, 0)).toBe(0);
      expect(calculatePlatformFee(5, 0)).toBe(0);
    });

    it('returns 0 for zero or negative people', () => {
      expect(calculatePlatformFee(0, 449)).toBe(0);
      expect(calculatePlatformFee(-1, 449)).toBe(0);
    });

    it('calculates fixed rupee rule correctly for 1 to 10 people', () => {
      expect(calculatePlatformFee(1, 449)).toBe(6);  // 1 person -> ₹6
      expect(calculatePlatformFee(2, 449)).toBe(7);  // 2 people -> ₹7
      expect(calculatePlatformFee(3, 449)).toBe(8);  // 3 people -> ₹8
      expect(calculatePlatformFee(4, 449)).toBe(9);  // 4 people -> ₹9
      expect(calculatePlatformFee(5, 449)).toBe(10); // 5 people -> ₹10
      expect(calculatePlatformFee(6, 449)).toBe(11); // 6 people -> ₹11
      expect(calculatePlatformFee(7, 449)).toBe(12); // 7 people -> ₹12
      expect(calculatePlatformFee(8, 449)).toBe(13); // 8 people -> ₹13
      expect(calculatePlatformFee(9, 449)).toBe(14); // 9 people -> ₹14
      expect(calculatePlatformFee(10, 449)).toBe(15); // 10 people -> ₹15
    });

    it('is ONE combined fee, NOT charged separately per ticket', () => {
      // 2 people = ₹7 total fee, NOT ₹12 or ₹13
      expect(calculatePlatformFee(2, 449)).toBe(7);
      expect(calculatePlatformFee(2, 449)).not.toBe(13);
      expect(calculatePlatformFee(2, 449)).not.toBe(12);

      // 3 people = ₹8 total fee, NOT ₹20
      expect(calculatePlatformFee(3, 449)).toBe(8);
      expect(calculatePlatformFee(3, 449)).not.toBe(20);

      // 4 people = ₹9 total fee, NOT ₹26
      expect(calculatePlatformFee(4, 449)).toBe(9);
      expect(calculatePlatformFee(4, 449)).not.toBe(26);
    });

    it('is NOT a percentage calculation', () => {
      // Must not be 6% of 449 (26.94) or 7% of 898 (62.86)
      expect(calculatePlatformFee(1, 449)).toBe(6);
      expect(calculatePlatformFee(2, 449)).toBe(7);
    });
  });

  describe('calculateTotalTicketAmount', () => {
    it('returns 0 for free events or zero tickets', () => {
      expect(calculateTotalTicketAmount(0, 5)).toBe(0);
      expect(calculateTotalTicketAmount(449, 0)).toBe(0);
    });

    it('calculates total base ticket amount accurately', () => {
      expect(calculateTotalTicketAmount(449, 1)).toBe(449);
      expect(calculateTotalTicketAmount(449, 2)).toBe(898);
      expect(calculateTotalTicketAmount(449, 3)).toBe(1347);
      expect(calculateTotalTicketAmount(449, 4)).toBe(1796);
      expect(calculateTotalTicketAmount(449, 5)).toBe(2245);
    });
  });

  describe('calculateTotalAmount - Required Test Cases (ticket_price * people + platform_fee)', () => {
    it('returns 0 for free events', () => {
      expect(calculateTotalAmount(0, 1)).toBe(0);
      expect(calculateTotalAmount(0, 5)).toBe(0);
    });

    it('Case 1: ₹449 x 1 -> ₹449 + ₹6 = ₹455', () => {
      expect(calculateTotalAmount(449, 1)).toBe(455);
    });

    it('Case 2: ₹449 x 2 -> ₹898 + ₹7 = ₹905', () => {
      expect(calculateTotalAmount(449, 2)).toBe(905);
    });

    it('Case 3: ₹449 x 3 -> ₹1,347 + ₹8 = ₹1,355', () => {
      expect(calculateTotalAmount(449, 3)).toBe(1355);
    });

    it('Case 4: ₹449 x 4 -> ₹1,796 + ₹9 = ₹1,805', () => {
      expect(calculateTotalAmount(449, 4)).toBe(1805);
    });

    it('Case 5: ₹449 x 5 -> ₹2,245 + ₹10 = ₹2,255', () => {
      expect(calculateTotalAmount(449, 5)).toBe(2255);
    });

    it('Case 10: ₹449 x 10 -> ₹4,490 + ₹15 = ₹4,505', () => {
      expect(calculateTotalAmount(449, 10)).toBe(4505);
    });
  });

  describe('legacy backward compatibility', () => {
    it('calculateGatewayFee returns 0', () => {
      expect(calculateGatewayFee(1000)).toBe(0);
    });

    it('calculateTotalWithGatewayFee returns base amount', () => {
      expect(calculateTotalWithGatewayFee(1000)).toBe(1000);
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

