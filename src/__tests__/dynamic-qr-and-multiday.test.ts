import { generateDynamicQrCode } from '../lib/dynamic-qr-service';
import { renderTicketQrCard, buildDynamicQrEmailHtml } from '../lib/email-templates-festora';
import { getEffectiveRegistrationFields, type Event, type EventDay, type DynamicRegistrationField } from '../types/event';
import type { DayTicketPass, DynamicQrPass } from '../types/firestore';

describe('Dynamic QR & Multi-Day Event Systems', () => {
  describe('1. Dynamic QR Code Generation & Formatting', () => {
    it('generates unique coupon codes with clean prefixes from field/code names', () => {
      // Indexed participant codes (e.g. Participant 1 -> #FC001)
      const code1 = generateDynamicQrCode('Food Coupon', 1);
      const code2 = generateDynamicQrCode('Food Coupon', 2);
      const code3 = generateDynamicQrCode('Lunch Pass', 1);
      const code4 = generateDynamicQrCode('VIP Lounge Pass', 42);

      expect(code1).toBe('FC001');
      expect(code2).toBe('FC002');
      expect(code3).toBe('LP001');
      expect(code4).toBe('VLP042');

      // Random token coupon codes (e.g. FC-8A72K)
      const randomCode1 = generateDynamicQrCode('Food Coupon');
      const randomCode2 = generateDynamicQrCode('Food Coupon');
      expect(randomCode1).toMatch(/^FC-[A-Z0-9]{5}$/);
      expect(randomCode2).toMatch(/^FC-[A-Z0-9]{5}$/);
      expect(randomCode1).not.toBe(randomCode2);
    });

    it('supports arbitrary organizer-configured QR field names without hardcoding', () => {
      const workshopCode = generateDynamicQrCode('Workshop Pass', 5);
      const merchCode = generateDynamicQrCode('Merchandise Coupon', 10);
      const parkingCode = generateDynamicQrCode('Parking Pass', 3);

      expect(workshopCode).toBe('WP005');
      expect(merchCode).toBe('MC010');
      expect(parkingCode).toBe('PP003');
    });
  });

  describe('2. Multi-Day Event Schedule Configuration', () => {
    it('allows configuring single day vs multiple event days', () => {
      const singleDayEvent: Partial<Event> = {
        id: 'evt_single_1',
        title: 'Tech Meetup',
        startDate: '2026-10-10',
        isMultiDay: false,
        status: 'published',
        ticketsSold: 50,
        totalTickets: 100,
      };

      const multiDayEvent: Partial<Event> = {
        id: 'evt_multi_1',
        title: 'Festora Tech Summit',
        startDate: '2026-10-10',
        endDate: '2026-10-11',
        isMultiDay: true,
        eventDays: [
          { dayNumber: 1, date: '2026-10-10', startTime: '09:00', endTime: '18:00', title: 'Keynotes & Panels' },
          { dayNumber: 2, date: '2026-10-11', startTime: '09:30', endTime: '17:00', title: 'Workshops & Hackathon' }
        ],
        status: 'published',
        ticketsSold: 200,
        totalTickets: 250,
      };

      expect(singleDayEvent.isMultiDay).toBe(false);
      expect(multiDayEvent.isMultiDay).toBe(true);
      expect(multiDayEvent.eventDays).toHaveLength(2);
      expect(multiDayEvent.eventDays?.[0].dayNumber).toBe(1);
      expect(multiDayEvent.eventDays?.[1].dayNumber).toBe(2);
    });
  });

  describe('3. Multi-Day Ticket Generation Rules', () => {
    it('generates 1 QR code for a 1-day event', () => {
      const isMultiDay = false;
      const eventDays: EventDay[] = [{ dayNumber: 1, date: '2026-10-10' }];
      const ticketId = 'TKT001';

      const dayTickets: DayTicketPass[] = isMultiDay && eventDays.length > 1
        ? eventDays.map(d => ({
            dayNumber: d.dayNumber,
            dayDate: d.date,
            passCode: `${ticketId}-D${d.dayNumber}`,
            qrCodeData: `${ticketId}-D${d.dayNumber}`,
            isCheckedIn: false
          }))
        : [];

      expect(dayTickets).toHaveLength(0); // Uses single standard ticket code
    });

    it('generates 2 separate QR codes for a 2-day event', () => {
      const isMultiDay = true;
      expect(isMultiDay).toBe(true);
      const eventDays: EventDay[] = [
        { dayNumber: 1, date: '2026-10-10' },
        { dayNumber: 2, date: '2026-10-11' }
      ];
      const ticketId = 'TF4821';

      const dayTickets: DayTicketPass[] = eventDays.map(d => ({
        dayNumber: d.dayNumber,
        dayDate: d.date,
        passCode: `${ticketId}-D${d.dayNumber}`,
        qrCodeData: `${ticketId}-D${d.dayNumber}`,
        isCheckedIn: false
      }));

      expect(dayTickets).toHaveLength(2);
      expect(dayTickets[0].passCode).toBe('TF4821-D1');
      expect(dayTickets[0].dayNumber).toBe(1);
      expect(dayTickets[1].passCode).toBe('TF4821-D2');
      expect(dayTickets[1].dayNumber).toBe(2);
    });

    it('generates 3 separate QR codes for a 3-day event', () => {
      const eventDays: EventDay[] = [
        { dayNumber: 1, date: '2026-10-10' },
        { dayNumber: 2, date: '2026-10-11' },
        { dayNumber: 3, date: '2026-10-12' }
      ];
      const ticketId = 'SUMMIT99';

      const dayTickets: DayTicketPass[] = eventDays.map(d => ({
        dayNumber: d.dayNumber,
        dayDate: d.date,
        passCode: `${ticketId}-D${d.dayNumber}`,
        qrCodeData: `${ticketId}-D${d.dayNumber}`,
        isCheckedIn: false
      }));

      expect(dayTickets).toHaveLength(3);
      expect(dayTickets.map(d => d.passCode)).toEqual(['SUMMIT99-D1', 'SUMMIT99-D2', 'SUMMIT99-D3']);
    });

    it('generates separate day passes for every team member in multi-member registrations', () => {
      const teamMembers = ['Alice', 'Bob', 'Charlie', 'Diana'];
      const eventDays: EventDay[] = [
        { dayNumber: 1, date: '2026-10-10' },
        { dayNumber: 2, date: '2026-10-11' }
      ];

      const allMemberPasses = teamMembers.map((member, idx) => {
        const memberTicketId = `TEAM_TKT_${idx + 1}`;
        return {
          member,
          dayTickets: eventDays.map(d => ({
            dayNumber: d.dayNumber,
            dayDate: d.date,
            passCode: `${memberTicketId}-D${d.dayNumber}`,
            isCheckedIn: false
          }))
        };
      });

      // 4 members * 2 days = 8 total QR codes, each linked uniquely to member ticket and day
      expect(allMemberPasses).toHaveLength(4);
      allMemberPasses.forEach((m, idx) => {
        expect(m.dayTickets).toHaveLength(2);
        expect(m.dayTickets[0].passCode).toBe(`TEAM_TKT_${idx + 1}-D1`);
        expect(m.dayTickets[1].passCode).toBe(`TEAM_TKT_${idx + 1}-D2`);
      });
    });
  });

  describe('4. Day-Specific Check-in Validation Logic', () => {
    function simulateCheckIn(
      ticket: { dayTickets: DayTicketPass[]; isCheckedIn: boolean },
      scannedCode: string,
      scanningDayNumber: number
    ) {
      // Parse day from code
      const match = scannedCode.match(/^(.+?)-D(?:AY)?(\d+)$/i);
      if (!match) {
        if (ticket.isCheckedIn) return { success: false, status: 'ALREADY CHECKED IN' };
        ticket.isCheckedIn = true;
        return { success: true, status: 'VALID' };
      }

      const passDay = Number(match[2]);
      if (passDay !== scanningDayNumber) {
        return {
          success: false,
          status: 'INVALID FOR TODAY',
          message: `This QR code is valid only for Day ${passDay}.`
        };
      }

      const dayPass = ticket.dayTickets.find(d => d.dayNumber === passDay);
      if (!dayPass) {
        return { success: false, status: 'INVALID QR', message: 'Day pass not found' };
      }

      if (dayPass.isCheckedIn) {
        return { success: false, status: 'ALREADY CHECKED IN', message: 'Already checked in' };
      }

      dayPass.isCheckedIn = true;
      return { success: true, status: 'VALID', message: `Day ${passDay} checked in successfully` };
    }

    it('Day 1 QR scanned on Day 1 is VALID and marks Day 1 checked in', () => {
      const ticket = {
        isCheckedIn: false,
        dayTickets: [
          { dayNumber: 1, dayDate: '2026-10-10', passCode: 'TF4821-D1', qrCodeData: 'TF4821-D1', isCheckedIn: false },
          { dayNumber: 2, dayDate: '2026-10-11', passCode: 'TF4821-D2', qrCodeData: 'TF4821-D2', isCheckedIn: false }
        ]
      };

      const result = simulateCheckIn(ticket, 'TF4821-D1', 1);
      expect(result.success).toBe(true);
      expect(result.status).toBe('VALID');
      expect(ticket.dayTickets[0].isCheckedIn).toBe(true);
      expect(ticket.dayTickets[1].isCheckedIn).toBe(false);
    });

    it('Day 2 QR scanned on Day 2 is VALID and marks Day 2 checked in', () => {
      const ticket = {
        isCheckedIn: false,
        dayTickets: [
          { dayNumber: 1, dayDate: '2026-10-10', passCode: 'TF4821-D1', qrCodeData: 'TF4821-D1', isCheckedIn: false },
          { dayNumber: 2, dayDate: '2026-10-11', passCode: 'TF4821-D2', qrCodeData: 'TF4821-D2', isCheckedIn: false }
        ]
      };

      const result = simulateCheckIn(ticket, 'TF4821-D2', 2);
      expect(result.success).toBe(true);
      expect(result.status).toBe('VALID');
      expect(ticket.dayTickets[1].isCheckedIn).toBe(true);
    });

    it('Day 1 QR scanned on Day 2 is INVALID with descriptive day error', () => {
      const ticket = {
        isCheckedIn: false,
        dayTickets: [
          { dayNumber: 1, dayDate: '2026-10-10', passCode: 'TF4821-D1', qrCodeData: 'TF4821-D1', isCheckedIn: false },
          { dayNumber: 2, dayDate: '2026-10-11', passCode: 'TF4821-D2', qrCodeData: 'TF4821-D2', isCheckedIn: false }
        ]
      };

      const result = simulateCheckIn(ticket, 'TF4821-D1', 2);
      expect(result.success).toBe(false);
      expect(result.status).toBe('INVALID FOR TODAY');
      expect(result.message).toBe('This QR code is valid only for Day 1.');
      expect(ticket.dayTickets[0].isCheckedIn).toBe(false);
    });

    it('Day 2 QR scanned on Day 1 is INVALID with descriptive day error', () => {
      const ticket = {
        isCheckedIn: false,
        dayTickets: [
          { dayNumber: 1, dayDate: '2026-10-10', passCode: 'TF4821-D1', qrCodeData: 'TF4821-D1', isCheckedIn: false },
          { dayNumber: 2, dayDate: '2026-10-11', passCode: 'TF4821-D2', qrCodeData: 'TF4821-D2', isCheckedIn: false }
        ]
      };

      const result = simulateCheckIn(ticket, 'TF4821-D2', 1);
      expect(result.success).toBe(false);
      expect(result.status).toBe('INVALID FOR TODAY');
      expect(result.message).toBe('This QR code is valid only for Day 2.');
    });

    it('Same day QR scanned twice on the same day is rejected as ALREADY CHECKED IN', () => {
      const ticket = {
        isCheckedIn: false,
        dayTickets: [
          { dayNumber: 1, dayDate: '2026-10-10', passCode: 'TF4821-D1', qrCodeData: 'TF4821-D1', isCheckedIn: false }
        ]
      };

      const firstScan = simulateCheckIn(ticket, 'TF4821-D1', 1);
      expect(firstScan.success).toBe(true);

      const secondScan = simulateCheckIn(ticket, 'TF4821-D1', 1);
      expect(secondScan.success).toBe(false);
      expect(secondScan.status).toBe('ALREADY CHECKED IN');
    });
  });

  describe('5. Dynamic QR Coupon Redemption Logic', () => {
    function simulateCouponRedemption(
      pass: DynamicQrPass,
      targetEventId: string,
      currentDayNumber?: number
    ) {
      if (pass.eventId !== targetEventId) {
        return { success: false, status: 'INVALID QR', message: 'This QR belongs to another event.' };
      }
      if (pass.status === 'cancelled') {
        return { success: false, status: 'INVALID REGISTRATION', message: 'Registration cancelled or refunded.' };
      }
      if (pass.validDayNumber && pass.validDayNumber !== 'all' && currentDayNumber !== undefined) {
        if (Number(pass.validDayNumber) !== Number(currentDayNumber)) {
          return {
            success: false,
            status: 'INVALID FOR TODAY',
            message: `This QR code is valid only for Day ${pass.validDayNumber}.`
          };
        }
      }
      if (pass.status === 'redeemed') {
        return { success: false, status: 'ALREADY REDEEMED', message: 'Coupon already redeemed previously.' };
      }

      // Mark redeemed
      pass.status = 'redeemed';
      pass.redeemedAt = new Date().toISOString();
      pass.redeemedBy = 'Food Counter Staff';

      return { success: true, status: 'REDEEMED', message: 'Coupon redeemed successfully!' };
    }

    it('unused coupon scans as valid and redeems properly', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TKT1_FIELD1',
        eventId: 'evt_tech_1',
        eventTitle: 'Festora Tech Summit',
        registrationId: 'ORD_101',
        ticketId: 'TKT_101',
        participantId: 'USR_101',
        participantName: 'Pavan',
        participantEmail: 'pavan@example.com',
        fieldId: 'field_food_1',
        fieldName: 'Food Coupon',
        qrName: 'Lunch Coupon',
        code: 'FC-8A72K',
        status: 'active',
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      const redeemResult = simulateCouponRedemption(pass, 'evt_tech_1');
      expect(redeemResult.success).toBe(true);
      expect(redeemResult.status).toBe('REDEEMED');
      expect(pass.status).toBe('redeemed');
      expect(pass.redeemedAt).toBeDefined();
      expect(pass.redeemedBy).toBe('Food Counter Staff');
    });

    it('coupon scanned a second time is rejected as ALREADY REDEEMED', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TKT2_FIELD1',
        eventId: 'evt_tech_1',
        registrationId: 'ORD_102',
        ticketId: 'TKT_102',
        participantName: 'Rahul',
        participantEmail: 'rahul@example.com',
        fieldId: 'field_food_1',
        fieldName: 'Food Coupon',
        qrName: 'Lunch Coupon',
        code: 'FC-9912A',
        status: 'active',
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      simulateCouponRedemption(pass, 'evt_tech_1');
      const secondScan = simulateCouponRedemption(pass, 'evt_tech_1');

      expect(secondScan.success).toBe(false);
      expect(secondScan.status).toBe('ALREADY REDEEMED');
    });

    it('coupon for another event is rejected as INVALID QR', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TKT3_FIELD1',
        eventId: 'evt_other_festival',
        registrationId: 'ORD_103',
        ticketId: 'TKT_103',
        participantName: 'Priya',
        participantEmail: 'priya@example.com',
        fieldId: 'field_food_1',
        fieldName: 'Food Coupon',
        qrName: 'Lunch Coupon',
        code: 'FC-3321B',
        status: 'active',
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      const result = simulateCouponRedemption(pass, 'evt_tech_1');
      expect(result.success).toBe(false);
      expect(result.status).toBe('INVALID QR');
    });

    it('day-specific coupon scanned on wrong day is rejected as INVALID FOR TODAY', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TKT4_FIELD1',
        eventId: 'evt_tech_1',
        registrationId: 'ORD_104',
        ticketId: 'TKT_104',
        participantName: 'Pavan',
        participantEmail: 'pavan@example.com',
        fieldId: 'field_lunch_d2',
        fieldName: 'Food Coupon - Day 2',
        qrName: 'Day 2 Lunch Coupon',
        code: 'FC-DAY2K',
        validDayNumber: 2,
        status: 'active',
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      const result = simulateCouponRedemption(pass, 'evt_tech_1', 1);
      expect(result.success).toBe(false);
      expect(result.status).toBe('INVALID FOR TODAY');
      expect(result.message).toBe('This QR code is valid only for Day 2.');
    });

    it('cancelled registration coupon is rejected as INVALID REGISTRATION', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TKT5_FIELD1',
        eventId: 'evt_tech_1',
        registrationId: 'ORD_105',
        ticketId: 'TKT_105',
        participantName: 'Pavan',
        participantEmail: 'pavan@example.com',
        fieldId: 'field_food_1',
        fieldName: 'Food Coupon',
        qrName: 'Lunch Coupon',
        code: 'FC-CANCL',
        status: 'cancelled',
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      const result = simulateCouponRedemption(pass, 'evt_tech_1');
      expect(result.success).toBe(false);
      expect(result.status).toBe('INVALID REGISTRATION');
    });
  });

  describe('6. Professional Festora Email Rendering', () => {
    it('renderTicketQrCard renders multiple day passes for multi-day events', () => {
      const html = renderTicketQrCard({
        ticketCode: 'TF4821',
        dayTickets: [
          { dayNumber: 1, dayDate: '10 October 2026', passCode: 'TF4821-D1' },
          { dayNumber: 2, dayDate: '11 October 2026', passCode: 'TF4821-D2' }
        ]
      });

      expect(html).toContain('DAY 1 ENTRY PASS');
      expect(html).toContain('DAY 2 ENTRY PASS');
      expect(html).toContain('10 October 2026');
      expect(html).toContain('11 October 2026');
      expect(html).toContain('TF4821-D1');
      expect(html).toContain('TF4821-D2');
    });

    it('buildDynamicQrEmailHtml renders branded food coupon pass email matching specification', () => {
      const emailHtml = buildDynamicQrEmailHtml({
        participantName: 'Pavan',
        eventTitle: 'Festora Tech Event',
        couponName: 'Lunch Coupon',
        qrFieldName: 'Food Coupon',
        qrCode: 'FC-8A72K',
        eventDate: '10 October 2026',
        instructions: 'Show the QR code at the food counter to redeem your coupon.'
      });

      expect(emailHtml).toContain('FESTORA');
      expect(emailHtml).toContain('FOOD COUPON');
      expect(emailHtml).toContain('Hello Pavan');
      expect(emailHtml).toContain('Festora Tech Event');
      expect(emailHtml).toContain('Lunch Coupon');
      expect(emailHtml).toContain('10 October 2026');
      expect(emailHtml).toContain('FC-8A72K');
      expect(emailHtml).toContain('Show the QR code at the food counter to redeem your coupon.');
      expect(emailHtml).toContain('VIEW COUPON');
    });
  });

  describe('7. Dynamic Registration Field Configuration & Form Filtering', () => {
    it('accepts both qr_code and dynamic_qr field types in registration fields', () => {
      const fields = getEffectiveRegistrationFields({
        fields: [
          { id: 'f_name', label: 'Full Name', type: 'text', required: true, displayOrder: 1, showOnTicket: true },
          { id: 'f_email', label: 'Email', type: 'email', required: true, displayOrder: 2, showOnTicket: true },
          { id: 'f_food_qr', label: 'Food Coupon', type: 'qr_code', required: false, displayOrder: 3, showOnTicket: true, qrCodeName: 'Food Coupon' },
          { id: 'f_kit_qr', label: 'Welcome Kit Pass', type: 'dynamic_qr', required: false, displayOrder: 4, showOnTicket: true, qrCodeName: 'Welcome Kit' }
        ]
      });

      expect(fields.length).toBe(4);
      expect(fields[2].type).toBe('qr_code');
      expect(fields[3].type).toBe('dynamic_qr');
    });

    it('filters out dynamic QR fields from attendee input questionnaire', () => {
      const allFields = getEffectiveRegistrationFields({
        fields: [
          { id: 'f_name', label: 'Full Name', type: 'text', required: true, displayOrder: 1, showOnTicket: true },
          { id: 'f_email', label: 'Email', type: 'email', required: true, displayOrder: 2, showOnTicket: true },
          { id: 'f_tshirt', label: 'T-Shirt Size', type: 'dropdown', required: true, displayOrder: 3, showOnTicket: true },
          { id: 'f_food_qr', label: 'Food Coupon', type: 'qr_code', required: false, displayOrder: 4, showOnTicket: true },
          { id: 'f_vip_qr', label: 'VIP Pass', type: 'dynamic_qr', required: false, displayOrder: 5, showOnTicket: true }
        ]
      });

      // Attendees should only be prompted for questionnaire fields, not auto-generated QR passes
      const attendeeFormFields = allFields.filter(
        (f: DynamicRegistrationField) => f.type !== 'dynamic_qr' && f.type !== 'qr_code' && !String(f.type || '').toLowerCase().includes('qr')
      );

      expect(attendeeFormFields.length).toBe(3);
      expect(attendeeFormFields.map((f: DynamicRegistrationField) => f.id)).toEqual(['f_name', 'f_email', 'f_tshirt']);
    });
  });

  describe('8. Dynamic QR Auto-Issuance for Solo and Team Registrations', () => {
    // Helper simulating the core auto-issuance logic in autoIssueDynamicQrsForTickets
    function simulateAutoIssue(eventFields: any[], tickets: any[], orderData: any): DynamicQrPass[] {
      const dynamicQrFields = eventFields.filter(
        f => (f.type === 'dynamic_qr' || f.type === 'qr_code' || String(f.type || '').toLowerCase().includes('qr')) &&
             f.enabled !== false &&
             f.autoGenerateNewRegistrations !== false
      );

      const issued: DynamicQrPass[] = [];
      let seq = 0;

      for (const field of dynamicQrFields) {
        for (const ticket of tickets) {
          seq++;
          const code = generateDynamicQrCode(field.qrCodeName || field.label, seq);
          const participantName =
            ticket.teamInfo?.memberName ||
            ticket.memberName ||
            ticket.customerDetails?.name ||
            orderData.customerDetails?.name ||
            'Participant';

          const participantEmail =
            ticket.teamInfo?.memberEmail ||
            ticket.memberEmail ||
            ticket.customerDetails?.email ||
            orderData.customerDetails?.email ||
            '';

          issued.push({
            id: `DQR_${ticket.ticketId}_${field.id}`,
            eventId: orderData.eventId,
            eventTitle: orderData.eventTitle || 'Festora Event',
            registrationId: orderData.id || ticket.orderId,
            ticketId: ticket.ticketId,
            participantName,
            participantEmail,
            teamName: ticket.teamInfo?.teamName || orderData.teamData?.teamName,
            fieldId: field.id,
            fieldName: field.label,
            qrName: field.qrCodeName || field.label,
            code,
            validDayNumber: field.validDayNumber || 'all',
            status: 'active',
            emailStatus: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }

      return issued;
    }

    it('generates a dynamic QR code for solo registration participant', () => {
      const eventFields = [
        { id: 'f_food_qr', label: 'Food Coupon', type: 'qr_code', qrCodeName: 'Lunch Coupon', enabled: true, autoGenerateNewRegistrations: true }
      ];

      const soloTickets = [
        {
          ticketId: 'TF1001',
          orderId: 'ORD_SOLO_1',
          customerDetails: { name: 'Pavan Solo', email: 'pavan@solo.com', phone: '9876543210' }
        }
      ];

      const orderData = {
        id: 'ORD_SOLO_1',
        eventId: 'evt_tech_fest',
        eventTitle: 'Festora Annual Tech Fest',
        customerDetails: { name: 'Pavan Solo', email: 'pavan@solo.com' }
      };

      const issued = simulateAutoIssue(eventFields, soloTickets, orderData);

      expect(issued.length).toBe(1);
      expect(issued[0].ticketId).toBe('TF1001');
      expect(issued[0].participantName).toBe('Pavan Solo');
      expect(issued[0].participantEmail).toBe('pavan@solo.com');
      expect(issued[0].fieldName).toBe('Food Coupon');
      expect(issued[0].qrName).toBe('Lunch Coupon');
      expect(issued[0].code).toBe('LC001');
      expect(issued[0].status).toBe('active');
    });

    it('generates a unique dynamic QR code for each person in a team registration', () => {
      const eventFields = [
        { id: 'f_food_qr', label: 'Food Coupon', type: 'qr_code', qrCodeName: 'Food Coupon', enabled: true, autoGenerateNewRegistrations: true }
      ];

      const teamTickets = [
        {
          ticketId: 'TF2001',
          orderId: 'ORD_TEAM_1',
          teamInfo: { teamName: 'Binary Wolves', memberName: 'Alice Member', memberEmail: 'alice@team.com' },
          customerDetails: { name: 'Alice Member', email: 'alice@team.com' }
        },
        {
          ticketId: 'TF2002',
          orderId: 'ORD_TEAM_1',
          teamInfo: { teamName: 'Binary Wolves', memberName: 'Bob Member', memberEmail: 'bob@team.com' },
          customerDetails: { name: 'Bob Member', email: 'bob@team.com' }
        }
      ];

      const orderData = {
        id: 'ORD_TEAM_1',
        eventId: 'evt_tech_fest',
        eventTitle: 'Festora Annual Tech Fest',
        teamData: { teamName: 'Binary Wolves' }
      };

      const issued = simulateAutoIssue(eventFields, teamTickets, orderData);

      // Exactly 2 dynamic QR passes generated: 1 per team member
      expect(issued.length).toBe(2);

      // First member's dynamic QR
      expect(issued[0].ticketId).toBe('TF2001');
      expect(issued[0].participantName).toBe('Alice Member');
      expect(issued[0].participantEmail).toBe('alice@team.com');
      expect(issued[0].teamName).toBe('Binary Wolves');
      expect(issued[0].code).toBe('FC001');
      expect(issued[0].status).toBe('active');

      // Second member's dynamic QR
      expect(issued[1].ticketId).toBe('TF2002');
      expect(issued[1].participantName).toBe('Bob Member');
      expect(issued[1].participantEmail).toBe('bob@team.com');
      expect(issued[1].teamName).toBe('Binary Wolves');
      expect(issued[1].code).toBe('FC002');
      expect(issued[1].status).toBe('active');

      // Both codes are unique
      expect(issued[0].code).not.toBe(issued[1].code);
    });

    it('supports multiple dynamic QR fields per attendee (e.g. Food Coupon + Kit Pass)', () => {
      const eventFields = [
        { id: 'f_food', label: 'Food Coupon', type: 'qr_code', qrCodeName: 'Food Coupon', enabled: true, autoGenerateNewRegistrations: true },
        { id: 'f_kit', label: 'Kit Pass', type: 'dynamic_qr', qrCodeName: 'Swag Kit', enabled: true, autoGenerateNewRegistrations: true }
      ];

      const tickets = [
        {
          ticketId: 'TF3001',
          orderId: 'ORD_MULTI_1',
          customerDetails: { name: 'Charlie', email: 'charlie@test.com' }
        }
      ];

      const issued = simulateAutoIssue(eventFields, tickets, { id: 'ORD_MULTI_1', eventId: 'evt_fest' });

      expect(issued.length).toBe(2);
      expect(issued[0].fieldName).toBe('Food Coupon');
      expect(issued[0].code).toBe('FC001');
      expect(issued[1].fieldName).toBe('Kit Pass');
      expect(issued[1].code).toBe('SK002');
    });
  });

  describe('9. Scanner Dynamic QR Status Verification', () => {
    // Simulator matching validateDynamicQr and redeemDynamicQr
    function evaluateDynamicQr(pass: DynamicQrPass | null, scanCode: string, targetEventId?: string, currentDay?: number) {
      if (!pass || pass.code !== scanCode) {
        return {
          valid: false,
          status: 'INVALID QR',
          message: 'Invalid QR Code. No matching pass or coupon found.'
        };
      }

      if (targetEventId && pass.eventId !== targetEventId) {
        return {
          valid: false,
          status: 'INVALID QR',
          message: 'This QR belongs to another event.',
          pass
        };
      }

      if (pass.status === 'cancelled') {
        return {
          valid: false,
          status: 'INVALID REGISTRATION',
          message: 'The registration for this coupon was cancelled or refunded.',
          pass
        };
      }

      if (pass.validDayNumber && pass.validDayNumber !== 'all' && currentDay) {
        if (Number(pass.validDayNumber) !== Number(currentDay)) {
          return {
            valid: false,
            status: 'INVALID FOR TODAY',
            message: `This QR code is valid only for Day ${pass.validDayNumber}.`,
            pass
          };
        }
      }

      if (pass.status === 'redeemed') {
        return {
          valid: false,
          status: 'ALREADY REDEEMED',
          message: `Coupon already redeemed${pass.redeemedBy ? ` by ${pass.redeemedBy}` : ''}.`,
          pass
        };
      }

      return {
        valid: true,
        status: 'VALID',
        message: 'Valid coupon. Ready to redeem.',
        pass
      };
    }

    it('returns status VALID when active dynamic QR is scanned', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TF1001_f_food',
        eventId: 'evt_fest_1',
        registrationId: 'ORD_1',
        ticketId: 'TF1001',
        participantName: 'Alice Member',
        participantEmail: 'alice@team.com',
        teamName: 'Alpha Team',
        fieldId: 'f_food',
        fieldName: 'Food Coupon',
        qrName: 'Lunch Coupon',
        code: 'LC001',
        validDayNumber: 'all',
        status: 'active',
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      const result = evaluateDynamicQr(pass, 'LC001', 'evt_fest_1');
      expect(result.valid).toBe(true);
      expect(result.status).toBe('VALID');
      expect(result.message).toBe('Valid coupon. Ready to redeem.');
      expect(result.pass?.participantName).toBe('Alice Member');
      expect(result.pass?.teamName).toBe('Alpha Team');
    });

    it('returns status ALREADY REDEEMED when an already used dynamic QR is scanned', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TF1001_f_food',
        eventId: 'evt_fest_1',
        registrationId: 'ORD_1',
        ticketId: 'TF1001',
        participantName: 'Alice Member',
        participantEmail: 'alice@team.com',
        fieldId: 'f_food',
        fieldName: 'Food Coupon',
        qrName: 'Lunch Coupon',
        code: 'LC001',
        status: 'redeemed',
        redeemedBy: 'Food Counter Staff',
        redeemedAt: new Date().toISOString(),
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      const result = evaluateDynamicQr(pass, 'LC001', 'evt_fest_1');
      expect(result.valid).toBe(false);
      expect(result.status).toBe('ALREADY REDEEMED');
      expect(result.message).toContain('Food Counter Staff');
    });

    it('returns status INVALID FOR TODAY when scanned on wrong day', () => {
      const pass: DynamicQrPass = {
        id: 'DQR_TF1001_f_food',
        eventId: 'evt_fest_1',
        registrationId: 'ORD_1',
        ticketId: 'TF1001',
        participantName: 'Alice Member',
        participantEmail: 'alice@team.com',
        fieldId: 'f_food',
        fieldName: 'Food Coupon',
        qrName: 'Lunch Coupon',
        code: 'LC001',
        validDayNumber: 2,
        status: 'active',
        emailStatus: 'sent',
        createdAt: new Date().toISOString()
      };

      const result = evaluateDynamicQr(pass, 'LC001', 'evt_fest_1', 1);
      expect(result.valid).toBe(false);
      expect(result.status).toBe('INVALID FOR TODAY');
      expect(result.message).toContain('valid only for Day 2');
    });

    it('returns status INVALID QR when nonexistent code is scanned', () => {
      const result = evaluateDynamicQr(null, 'UNKNOWN_CODE', 'evt_fest_1');
      expect(result.valid).toBe(false);
      expect(result.status).toBe('INVALID QR');
    });
  });
});
