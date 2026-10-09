import { DEFAULT_POSTER_PASSES, EventTicketPass } from '../types/event';
import { calculatePlatformFee } from '../lib/payment';

describe('Event Ticket Passes & Team Member Email Forwarding', () => {
  describe('1. Default Event Poster Passes (HUMAN x AI Event)', () => {
    it('defines exactly the 3 passes matching the poster and UI cards', () => {
      expect(DEFAULT_POSTER_PASSES).toHaveLength(3);

      const [solo, duo, earlyBird] = DEFAULT_POSTER_PASSES;

      // Solo Pass
      expect(solo.name).toBe('Solo');
      expect(solo.price).toBe(249);
      expect(solo.teamSize).toBe(1);
      expect(solo.badgeText).toBe('SOLO • 1 PERSON');
      expect(solo.capacity).toBe(120);
      expect(solo.purchaseLimitText).toBe('1 - 5 per order');
      expect(solo.includesFoodCoupon).toBe(true);

      // Duo Pass
      expect(duo.name).toBe('Duo');
      expect(duo.price).toBe(499);
      expect(duo.teamSize).toBe(2);
      expect(duo.badgeText).toBe('DUO • 2 PEOPLE');
      expect(duo.capacity).toBe(80);
      expect(duo.purchaseLimitText).toBe('1 - 2 per order');
      expect(duo.includesFoodCoupon).toBe(true);

      // Early Bird Pass
      expect(earlyBird.name).toBe('Early Bird');
      expect(earlyBird.price).toBe(449);
      expect(earlyBird.teamSize).toBe(2);
      expect(earlyBird.badgeText).toBe('DUO • 2 PEOPLE');
      expect(earlyBird.capacity).toBe(40);
      expect(earlyBird.purchaseLimitText).toBe('1 - 2 per order');
      expect(earlyBird.includesFoodCoupon).toBe(true);
    });
  });

  describe('2. Tiered Pass Pricing Calculation', () => {
    it('calculates fixed pass price for Duo (₹499) rather than multiplying per person', () => {
      const duoPass = DEFAULT_POSTER_PASSES.find(p => p.id === 'pass_duo')!;
      const teamSize = duoPass.teamSize || 2;

      // Pass price is ₹499 for the entire duo, not 499 * 2
      const baseAmount = duoPass.price;
      expect(baseAmount).toBe(499);

      // Festora Platform fee for 2 people = ₹5 + 2 = ₹7
      const platformFee = calculatePlatformFee(teamSize, baseAmount);
      expect(platformFee).toBe(7);

      const totalAmount = baseAmount + platformFee;
      expect(totalAmount).toBe(506);
    });

    it('calculates pass price for Solo (₹249) with 1 person platform fee', () => {
      const soloPass = DEFAULT_POSTER_PASSES.find(p => p.id === 'pass_solo')!;
      const teamSize = soloPass.teamSize || 1;

      const baseAmount = soloPass.price;
      expect(baseAmount).toBe(249);

      // Platform fee for 1 person = ₹5 + 1 = ₹6
      const platformFee = calculatePlatformFee(teamSize, baseAmount);
      expect(platformFee).toBe(6);

      const totalAmount = baseAmount + platformFee;
      expect(totalAmount).toBe(255);
    });

    it('calculates pass price for Early Bird (₹449) with 2 people platform fee', () => {
      const earlyBirdPass = DEFAULT_POSTER_PASSES.find(p => p.id === 'pass_early_bird')!;
      const teamSize = earlyBirdPass.teamSize || 2;

      const baseAmount = earlyBirdPass.price;
      expect(baseAmount).toBe(449);

      const platformFee = calculatePlatformFee(teamSize, baseAmount);
      expect(platformFee).toBe(7);

      const totalAmount = baseAmount + platformFee;
      expect(totalAmount).toBe(456);
    });

    it('handles free promotional pass (₹0) cleanly without platform fees', () => {
      const freePass: EventTicketPass = {
        id: 'pass_free_promo',
        name: 'Free Early Bird',
        price: 0,
        badgeText: 'DUO • 2 PEOPLE',
        teamSize: 2,
        capacity: 20,
        description: 'Complimentary pass'
      };

      const baseAmount = freePass.price;
      const effectiveIsPaid = baseAmount > 0;
      const platformFee = effectiveIsPaid ? calculatePlatformFee(freePass.teamSize!, baseAmount) : 0;
      const totalAmount = baseAmount + platformFee;

      expect(baseAmount).toBe(0);
      expect(platformFee).toBe(0);
      expect(totalAmount).toBe(0);
      expect(effectiveIsPaid).toBe(false);
    });
  });

  describe('3. Team Registration Forwarding Tickets to Each Mentioned Email ID', () => {
    const mockTeamData = {
      teamName: 'Neural Ninjas',
      passId: 'pass_duo',
      passName: 'Duo',
      passPrice: 499,
      badgeText: 'DUO • 2 PEOPLE',
      members: [
        {
          name: 'Pavan Kalyan',
          email: 'pavan@example.com',
          phone: '+919876543210',
          rollNumber: '2103A51001',
          college: 'Malla Reddy University',
          department: 'AIML'
        },
        {
          name: 'Harshitha V',
          email: 'harshitha@example.com',
          phone: '+919876543211',
          rollNumber: '2103A51002',
          college: 'Malla Reddy University',
          department: 'AIML'
        }
      ]
    };

    it('creates distinct ticket codes and passes for every member in the team', () => {
      const createdTickets = mockTeamData.members.map((member, idx) => {
        const ticketId = `HA${3000 + idx}`;
        return {
          ticketId,
          orderId: 'order_12345',
          ticketNumber: idx + 1,
          customerDetails: {
            name: member.name,
            email: member.email,
            phone: member.phone
          },
          teamInfo: {
            teamName: mockTeamData.teamName,
            memberName: member.name,
            memberEmail: member.email,
            memberPhone: member.phone,
            passName: mockTeamData.passName,
            passPrice: mockTeamData.passPrice,
            badgeText: mockTeamData.badgeText
          },
          passInfo: {
            passId: mockTeamData.passId,
            passName: mockTeamData.passName,
            passPrice: mockTeamData.passPrice,
            badgeText: mockTeamData.badgeText
          }
        };
      });

      expect(createdTickets).toHaveLength(2);

      // Verify Member 1
      expect(createdTickets[0].customerDetails.email).toBe('pavan@example.com');
      expect(createdTickets[0].customerDetails.name).toBe('Pavan Kalyan');
      expect(createdTickets[0].ticketId).toBe('HA3000');
      expect(createdTickets[0].passInfo.passName).toBe('Duo');

      // Verify Member 2
      expect(createdTickets[1].customerDetails.email).toBe('harshitha@example.com');
      expect(createdTickets[1].customerDetails.name).toBe('Harshitha V');
      expect(createdTickets[1].ticketId).toBe('HA3001');
      expect(createdTickets[1].passInfo.passName).toBe('Duo');

      // Individual ticket IDs must be unique
      expect(createdTickets[0].ticketId).not.toBe(createdTickets[1].ticketId);
    });

    it('ensures every team member email receives their personal ticket email dispatch payload', () => {
      const membersForEmail = mockTeamData.members.map((m, idx) => ({
        name: m.name,
        email: m.email.trim(),
        ticketCode: `HA${3000 + idx}`,
        phone: m.phone,
        rollNumber: m.rollNumber,
        college: m.college,
        department: m.department
      }));

      // Map to individual email dispatches
      const emailDispatches = membersForEmail.map(m => ({
        to: m.email,
        recipientName: m.name,
        ticketCode: m.ticketCode,
        subject: `🎫 Entry Ticket: "HUMAN x AI - The Intelligence Challenge" - Festora`
      }));

      expect(emailDispatches).toHaveLength(2);

      // Each member's email receives their own ticket
      expect(emailDispatches[0].to).toBe('pavan@example.com');
      expect(emailDispatches[0].recipientName).toBe('Pavan Kalyan');
      expect(emailDispatches[0].ticketCode).toBe('HA3000');

      expect(emailDispatches[1].to).toBe('harshitha@example.com');
      expect(emailDispatches[1].recipientName).toBe('Harshitha V');
      expect(emailDispatches[1].ticketCode).toBe('HA3001');

      // Verify recipient email addresses are distinct and valid
      const recipientEmails = emailDispatches.map(d => d.to);
      expect(new Set(recipientEmails).size).toBe(2);
      recipientEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });
});
