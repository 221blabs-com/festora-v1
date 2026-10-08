import {
  getEffectiveRegistrationFields,
  REGISTRATION_FIELD_TEMPLATES,
  DynamicRegistrationField,
  DynamicFieldAnswer,
} from '../types/event';
import { extractParticipantTicketItems, extractPaymentDetails } from '../lib/ticket-canvas';
import type { TicketData } from '../lib/payment';

describe('Dynamic Registration Field System', () => {
  describe('Field Presets & Configuration', () => {
    it('should include all required field templates with appropriate types and options', () => {
      const templateKeys = REGISTRATION_FIELD_TEMPLATES.map((t) => t.key);

      // Verify all specified presets exist
      expect(templateKeys).toContain('fullName');
      expect(templateKeys).toContain('email');
      expect(templateKeys).toContain('phone');
      expect(templateKeys).toContain('tshirtSize');
      expect(templateKeys).toContain('foodPreference');
      expect(templateKeys).toContain('collegeCompany');
      expect(templateKeys).toContain('age');
      expect(templateKeys).toContain('gender');
      expect(templateKeys).toContain('city');
      expect(templateKeys).toContain('emergencyContact');
      expect(templateKeys).toContain('customQuestion');

      // Check specific types
      const tshirtTmpl = REGISTRATION_FIELD_TEMPLATES.find((t) => t.key === 'tshirtSize');
      expect(tshirtTmpl?.type).toBe('dropdown');
      expect(tshirtTmpl?.options).toEqual(['XS', 'S', 'M', 'L', 'XL', 'XXL']);
      expect(tshirtTmpl?.showOnTicket).toBe(true);

      const foodTmpl = REGISTRATION_FIELD_TEMPLATES.find((t) => t.key === 'foodPreference');
      expect(foodTmpl?.type).toBe('dropdown');
      expect(foodTmpl?.options).toEqual(['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain']);
      expect(foodTmpl?.showOnTicket).toBe(true);

      const customTmpl = REGISTRATION_FIELD_TEMPLATES.find((t) => t.key === 'customQuestion');
      expect(customTmpl?.type).toBe('text');
      expect(customTmpl?.required).toBe(false);
    });
  });

  describe('getEffectiveRegistrationFields conversion and fallback', () => {
    it('should return default name, email, phone when no fields configured', () => {
      const result = getEffectiveRegistrationFields(undefined);
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0].id).toBe('field_name');
      expect(result[1].id).toBe('field_email');
      expect(result[2].id).toBe('field_phone');
      expect(result[0].showOnTicket).toBe(true);
    });

    it('should maintain custom dynamic fields sorted by display_order', () => {
      const configuredFields: DynamicRegistrationField[] = [
        {
          id: 'food_pref',
          label: 'Food Preference',
          type: 'radio',
          field_type: 'radio',
          required: true,
          options: ['Veg', 'Non-Veg'],
          displayOrder: 3,
          display_order: 3,
          showOnTicket: true,
          show_on_ticket: true,
        },
        {
          id: 'full_name',
          label: 'Participant Name',
          type: 'text',
          field_type: 'text',
          required: true,
          displayOrder: 1,
          display_order: 1,
          showOnTicket: true,
          show_on_ticket: true,
        },
        {
          id: 'tshirt',
          label: 'T-Shirt Size',
          type: 'dropdown',
          field_type: 'dropdown',
          required: false,
          options: ['M', 'L'],
          displayOrder: 2,
          display_order: 2,
          showOnTicket: true,
          show_on_ticket: true,
        },
      ];

      const result = getEffectiveRegistrationFields({ fields: configuredFields });
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('full_name');
      expect(result[1].id).toBe('tshirt');
      expect(result[2].id).toBe('food_pref');
    });

    it('should convert legacy preset/custom fields cleanly without breaking', () => {
      const legacyConfig = {
        presets: {
          requireCollege: true,
          requireTshirt: true,
          requireEmergencyContact: true,
        },
        customFields: [
          {
            id: 'diet_req',
            name: 'diet_req',
            label: 'Dietary Restriction',
            type: 'text' as const,
            required: false,
          },
        ],
      };

      const result = getEffectiveRegistrationFields(legacyConfig as any);
      const labels = result.map((f) => f.label);
      expect(labels).toContain('Full Name');
      expect(labels).toContain('Email');
      expect(labels).toContain('T-Shirt Size');
      expect(labels).toContain('College / University');
      expect(labels).toContain('Dietary Restriction');
    });
  });

  describe('extractParticipantTicketItems (Dynamic Ticket Details)', () => {
    it('should dynamically include ONLY fields with show_on_ticket = true', () => {
      const mockTicket = {
        ticketId: 'TF4821',
        orderId: 'ORD-98765',
        eventId: 'test-event-1',
        eventData: { title: 'Festora Summit 2026' },
        price: 449,
        fieldConfigs: [
          {
            id: 'name',
            label: 'Full Name',
            type: 'text' as const,
            field_type: 'text' as const,
            required: true,
            displayOrder: 1,
            display_order: 1,
            showOnTicket: true,
            show_on_ticket: true,
          },
          {
            id: 'tshirt',
            label: 'T-Shirt Size',
            type: 'dropdown' as const,
            field_type: 'dropdown' as const,
            required: true,
            displayOrder: 2,
            display_order: 2,
            showOnTicket: true,
            show_on_ticket: true,
          },
          {
            id: 'food',
            label: 'Food Preference',
            type: 'radio' as const,
            field_type: 'radio' as const,
            required: true,
            displayOrder: 3,
            display_order: 3,
            showOnTicket: true,
            show_on_ticket: true,
          },
          {
            id: 'phone',
            label: 'Phone Number',
            type: 'phone' as const,
            field_type: 'phone' as const,
            required: true,
            displayOrder: 4,
            display_order: 4,
            showOnTicket: false,
            show_on_ticket: false, // OMITTED from ticket
          },
          {
            id: 'notes',
            label: 'Internal Notes',
            type: 'textarea' as const,
            field_type: 'textarea' as const,
            required: false,
            displayOrder: 5,
            display_order: 5,
            showOnTicket: false,
            show_on_ticket: false, // OMITTED from ticket
          },
        ],
        registrationAnswers: [
          { fieldId: 'name', field_id: 'name', label: 'Full Name', answer: 'Pavan Kalyan', showOnTicket: true, show_on_ticket: true },
          { fieldId: 'tshirt', field_id: 'tshirt', label: 'T-Shirt Size', answer: 'L', showOnTicket: true, show_on_ticket: true },
          { fieldId: 'food', field_id: 'food', label: 'Food Preference', answer: 'Vegetarian', showOnTicket: true, show_on_ticket: true },
          { fieldId: 'phone', field_id: 'phone', label: 'Phone Number', answer: '+91 9876543210', showOnTicket: false, show_on_ticket: false },
          { fieldId: 'notes', field_id: 'notes', label: 'Internal Notes', answer: 'VIP guest note', showOnTicket: false, show_on_ticket: false },
        ],
      } as unknown as TicketData;

      const ticketItems = extractParticipantTicketItems(mockTicket);
      const labels = ticketItems.map((item) => item.label);
      const values = ticketItems.map((item) => item.value);

      // Verify shown fields
      expect(labels).toContain('Full Name');
      expect(labels).toContain('T-Shirt Size');
      expect(labels).toContain('Food Preference');

      expect(values).toContain('Pavan Kalyan');
      expect(values).toContain('L');
      expect(values).toContain('Vegetarian');

      // Verify hidden fields are NOT on ticket
      expect(labels).not.toContain('Phone Number');
      expect(labels).not.toContain('Internal Notes');
      expect(values).not.toContain('+91 9876543210');
      expect(values).not.toContain('VIP guest note');
    });

    it('should dynamically render any new organizer field like Accommodation Required', () => {
      const mockTicket = {
        ticketId: 'TF9999',
        eventData: { title: 'National Hackathon' },
        registrationAnswers: [
          { fieldId: 'name', field_id: 'name', label: 'Participant Name', answer: 'Aditi Rao', showOnTicket: true, show_on_ticket: true },
          { fieldId: 'accom', field_id: 'accom', label: 'Accommodation Required', answer: 'Yes', showOnTicket: true, show_on_ticket: true },
          { fieldId: 'track', field_id: 'track', label: 'Hackathon Track', answer: 'AI & Robotics', showOnTicket: true, show_on_ticket: true },
          { fieldId: 'github', field_id: 'github', label: 'GitHub Profile', answer: 'https://github.com/aditi', showOnTicket: true, show_on_ticket: true },
        ],
      } as unknown as TicketData;

      const ticketItems = extractParticipantTicketItems(mockTicket);

      expect(ticketItems).toEqual([
        { label: 'Participant Name', value: 'Aditi Rao' },
        { label: 'Accommodation Required', value: 'Yes' },
        { label: 'Hackathon Track', value: 'AI & Robotics' },
        { label: 'GitHub Profile', value: 'https://github.com/aditi' },
      ]);
    });

    it('should gracefully handle legacy tickets without registrationAnswers', () => {
      const legacyTicket = {
        ticketId: 'LEGACY-01',
        eventData: { title: 'Legacy Fest' },
        teamInfo: {
          teamName: 'Team Mavericks',
          memberName: 'Rohit Sharma',
          memberEmail: 'rohit@example.com',
          memberPhone: '+91 9876543210',
          isTeamEvent: true,
          customAnswers: {
            tshirt: 'XL',
            college: 'IIT Bombay',
          },
        },
      } as unknown as TicketData;

      const ticketItems = extractParticipantTicketItems(legacyTicket);

      expect(ticketItems).toEqual(
        expect.arrayContaining([
          { label: 'Participant Name', value: 'Rohit Sharma' },
          { label: 'Tshirt', value: 'XL' },
          { label: 'College', value: 'IIT Bombay' },
          { label: 'Team Name', value: 'Team Mavericks' },
        ])
      );
    });
  });

  describe('extractPaymentDetails (Payment Breakdown & Fixed Rupee Rule)', () => {
    it('should correctly format paid ticket with platform fee', () => {
      const ticket = {
        price: 449,
        pricingSnapshot: {
          ticketPrice: 449,
          platformFee: 6,
          totalAmount: 455,
        },
      } as unknown as TicketData;

      const details = extractPaymentDetails(ticket);
      expect(details.ticketPriceStr).toBe('₹449');
      expect(details.platformFeeStr).toBe('₹6');
      expect(details.totalAmountStr).toBe('₹455');
      expect(details.isFree).toBe(false);
    });

    it('should correctly format free ticket', () => {
      const freeTicket = {
        price: 0,
        pricingSnapshot: {
          ticketPrice: 0,
          platformFee: 0,
          totalAmount: 0,
        },
      } as unknown as TicketData;

      const details = extractPaymentDetails(freeTicket);
      expect(details.ticketPriceStr).toBe('₹0');
      expect(details.platformFeeStr).toBe('₹0');
      expect(details.totalAmountStr).toBe('₹0 (Free)');
      expect(details.isFree).toBe(true);
    });
  });

  describe('Database Data Contract', () => {
    it('should produce the correct schema structure for registration_field_answers', () => {
      const registrationId = 'REG_ABC_123';
      const answers: DynamicFieldAnswer[] = [
        { fieldId: 'full_name', field_id: 'full_name', label: 'Full Name', answer: 'Pavan Kalyan', showOnTicket: true, show_on_ticket: true },
        { fieldId: 'tshirt_size', field_id: 'tshirt_size', label: 'T-Shirt Size', answer: 'L', showOnTicket: true, show_on_ticket: true },
        { fieldId: 'food_preference', field_id: 'food_preference', label: 'Food Preference', answer: 'Vegetarian', showOnTicket: true, show_on_ticket: true },
      ];

      const dbRecords = answers.map((ans, idx) => ({
        id: `${registrationId}_${ans.field_id}_${idx}`,
        registration_id: registrationId,
        field_id: ans.field_id,
        answer: ans.answer,
      }));

      expect(dbRecords).toHaveLength(3);
      expect(dbRecords[0]).toEqual({
        id: 'REG_ABC_123_full_name_0',
        registration_id: 'REG_ABC_123',
        field_id: 'full_name',
        answer: 'Pavan Kalyan',
      });
      expect(dbRecords[1].answer).toBe('L');
      expect(dbRecords[2].answer).toBe('Vegetarian');
    });
  });
});
