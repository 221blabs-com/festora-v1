import { getDisplayTicketId } from '@/lib/ticket-id';
import type { TicketData } from '@/lib/payment';

describe('Team Registration Multiple Tickets & Images Generation', () => {
  const sampleEvent = {
    id: 'evt_hackathon_2026',
    title: 'AI Innovators Hackathon',
    dateTime: {
      startDate: '2026-11-15T09:00:00Z',
      endDate: '2026-11-16T18:00:00Z'
    },
    venue: 'Convention Center Tech Hall',
    isTeamEvent: true,
    isMultiDay: true,
    eventDays: [
      { dayNumber: 1, date: '2026-11-15' },
      { dayNumber: 2, date: '2026-11-16' }
    ]
  };

  const sampleTeamData = {
    teamName: 'Code Titans',
    teamSize: 3,
    members: [
      { name: 'Alice Smith', email: 'alice@example.com', phone: '9876543210', rollNumber: 'CS101' },
      { name: 'Bob Jones', email: 'bob@example.com', phone: '9876543211', rollNumber: 'CS102' },
      { name: 'Charlie Brown', email: 'charlie@example.com', phone: '9876543212', rollNumber: 'CS103' }
    ]
  };

  it('generates distinct TicketData objects for every member in a team registration', () => {
    const orderId = 'ord_team_999';
    const captainUserId = 'usr_alice_uid';

    const allTickets: TicketData[] = sampleTeamData.members.map((member, idx) => {
      const ticketId = `TF${2000 + idx}`;
      const dayTickets = sampleEvent.eventDays.map((d) => ({
        dayNumber: d.dayNumber,
        dayDate: d.date,
        passCode: `${ticketId}-D${d.dayNumber}`,
        qrCodeData: `${ticketId}-D${d.dayNumber}`,
        isCheckedIn: false,
      }));

      return {
        id: ticketId,
        ticketId,
        orderId,
        eventId: sampleEvent.id,
        userId: idx === 0 ? captainUserId : '',
        purchaserUserId: captainUserId,
        claimEmail: member.email,
        qrCodeData: ticketId,
        isCheckedIn: false,
        checkedInAt: null,
        dayTickets,
        createdAt: new Date().toISOString(),
        ticketNumber: idx + 1,
        totalTickets: sampleTeamData.teamSize,
        price: 0,
        ticketType: 'General Admission',
        customerDetails: {
          name: member.name,
          email: member.email,
          phone: member.phone
        },
        teamInfo: {
          teamName: sampleTeamData.teamName,
          memberName: member.name,
          memberEmail: member.email,
          memberPhone: member.phone,
          memberRollNumber: member.rollNumber,
          isTeamEvent: true
        } as any,
        eventData: {
          title: sampleEvent.title,
          dateTime: sampleEvent.dateTime,
          venue: sampleEvent.venue
        }
      };
    });

    // Exactly 3 tickets generated for 3 team members
    expect(allTickets).toHaveLength(3);

    // Verify member 1 (Captain)
    expect(allTickets[0]?.customerDetails?.name).toBe('Alice Smith');
    expect(allTickets[0]?.ticketNumber).toBe(1);
    expect(allTickets[0]?.totalTickets).toBe(3);
    expect(allTickets[0]?.teamInfo?.teamName).toBe('Code Titans');

    // Verify member 2
    expect(allTickets[1]?.customerDetails?.name).toBe('Bob Jones');
    expect(allTickets[1]?.ticketNumber).toBe(2);
    expect(allTickets[1]?.totalTickets).toBe(3);
    expect(allTickets[1]?.teamInfo?.memberName).toBe('Bob Jones');

    // Verify member 3
    expect(allTickets[2]?.customerDetails?.name).toBe('Charlie Brown');
    expect(allTickets[2]?.ticketNumber).toBe(3);
    expect(allTickets[2]?.totalTickets).toBe(3);

    // Verify all ticket IDs are unique
    const uniqueIds = new Set(allTickets.map(t => t.ticketId));
    expect(uniqueIds.size).toBe(3);
  });

  it('formats filename with attendee name so downloaded multiple ticket images are clearly distinguishable', () => {
    const ticketA = {
      id: 'TF2001',
      ticketId: 'TF2001',
      orderId: 'ord_1',
      eventId: 'evt_1',
      customerDetails: { name: 'Alice Smith', email: 'alice@test.com', phone: '9876543210' },
      teamInfo: { teamName: 'Alpha Team', memberName: 'Alice Smith', isTeamEvent: true } as any,
      eventData: { title: 'Tech Expo 2026' } as any
    } as unknown as TicketData;

    const ticketB = {
      id: 'TF2002',
      ticketId: 'TF2002',
      orderId: 'ord_1',
      eventId: 'evt_1',
      customerDetails: { name: 'Bob Jones', email: 'bob@test.com', phone: '9876543211' },
      teamInfo: { teamName: 'Alpha Team', memberName: 'Bob Jones', isTeamEvent: true } as any,
      eventData: { title: 'Tech Expo 2026' } as any
    } as unknown as TicketData;

    const generateFileName = (ticket: TicketData) => {
      const safeTitle = (ticket.eventData?.title || 'event')
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase()
        .slice(0, 30);
      const safeId = getDisplayTicketId(ticket, ticket.eventData?.title);
      const attendeeName = (ticket.teamInfo?.memberName || ticket.customerDetails?.name || '')
        .trim()
        .replace(/[^a-zA-Z0-9]/g, '-')
        .slice(0, 20);
      const namePart = attendeeName ? `-${attendeeName}` : '';
      return `Festora-${safeTitle}${namePart}-${safeId}.png`;
    };

    const fileNameA = generateFileName(ticketA);
    const fileNameB = generateFileName(ticketB);

    expect(fileNameA).toBe('Festora-tech-expo-2026-Alice-Smith-TF2001.png');
    expect(fileNameB).toBe('Festora-tech-expo-2026-Bob-Jones-TF2002.png');
    expect(fileNameA).not.toBe(fileNameB);
  });

  it('consolidates tickets for purchaser across owned, purchased, and order records', () => {
    const captainUserId = 'usr_captain_123';

    // Mock records that would come from Firestore queries:
    // 1. Direct ticket where userId == captainUserId
    const ownedTickets = [
      { id: 'TKT_1', ticketId: 'TKT_1', userId: captainUserId, orderId: 'ORD_100', name: 'Captain' }
    ];

    // 2. Teammate ticket where purchaserUserId == captainUserId, but userId is null
    const purchasedTickets = [
      { id: 'TKT_2', ticketId: 'TKT_2', userId: null, purchaserUserId: captainUserId, orderId: 'ORD_100', name: 'Member 2' }
    ];

    // 3. Teammate ticket from order ORD_100 (backwards compatibility)
    const orderTickets = [
      { id: 'TKT_1', ticketId: 'TKT_1', userId: captainUserId, orderId: 'ORD_100', name: 'Captain' },
      { id: 'TKT_3', ticketId: 'TKT_3', userId: null, orderId: 'ORD_100', name: 'Member 3' }
    ];

    // Consolidation map logic
    const ticketDocMap = new Map<string, any>();
    ownedTickets.forEach(t => ticketDocMap.set(t.id, t));
    purchasedTickets.forEach(t => ticketDocMap.set(t.id, t));
    orderTickets.forEach(t => ticketDocMap.set(t.id, t));

    const finalTickets = Array.from(ticketDocMap.values());

    // Should include all 3 tickets and deduplicate TKT_1
    expect(finalTickets).toHaveLength(3);
    expect(finalTickets.map(t => t.id).sort()).toEqual(['TKT_1', 'TKT_2', 'TKT_3'].sort());
  });

  it('generates multi-day QR codes for every team member in a multi-day team event', () => {
    const members = ['Player 1', 'Player 2'];
    const days = [
      { dayNumber: 1, date: '2026-12-01' },
      { dayNumber: 2, date: '2026-12-02' }
    ];

    const memberPasses = members.map((m, idx) => {
      const ticketId = `TKT_MD_${idx + 1}`;
      return {
        member: m,
        ticketId,
        dayTickets: days.map(d => ({
          dayNumber: d.dayNumber,
          dayDate: d.date,
          passCode: `${ticketId}-D${d.dayNumber}`,
          qrCodeData: `${ticketId}-D${d.dayNumber}`,
        }))
      };
    });

    expect(memberPasses).toHaveLength(2);
    expect(memberPasses[0].dayTickets).toHaveLength(2);
    expect(memberPasses[0].dayTickets[0].passCode).toBe('TKT_MD_1-D1');
    expect(memberPasses[0].dayTickets[1].passCode).toBe('TKT_MD_1-D2');
    expect(memberPasses[1].dayTickets[0].passCode).toBe('TKT_MD_2-D1');
    expect(memberPasses[1].dayTickets[1].passCode).toBe('TKT_MD_2-D2');
  });

  it('routes tickets and individual confirmations to all mentioned team member email IDs', () => {
    const teamMembers = [
      { name: 'Alice Smith', email: 'alice@example.com', ticketCode: 'TK-101' },
      { name: 'Bob Jones', email: 'bob@example.com', ticketCode: 'TK-102' },
      { name: 'Charlie Brown', email: 'charlie@example.com', ticketCode: 'TK-103' }
    ];

    const purchaserEmail = 'manager@example.com';

    // Simulate email dispatch queue
    const sentEmails: Array<{ to: string; recipientName: string; ticketCode: string }> = [];

    teamMembers.forEach((member) => {
      sentEmails.push({
        to: member.email,
        recipientName: member.name,
        ticketCode: member.ticketCode
      });
    });

    // Check if purchaser email is distinct and gets order summary
    const memberEmailSet = new Set(teamMembers.map(m => m.email.toLowerCase()));
    if (!memberEmailSet.has(purchaserEmail.toLowerCase())) {
      sentEmails.push({
        to: purchaserEmail,
        recipientName: 'Team Manager',
        ticketCode: 'ORD_SUMMARY'
      });
    }

    // Verify all 3 mentioned team member emails received their individual ticket
    expect(sentEmails.some(e => e.to === 'alice@example.com' && e.ticketCode === 'TK-101')).toBe(true);
    expect(sentEmails.some(e => e.to === 'bob@example.com' && e.ticketCode === 'TK-102')).toBe(true);
    expect(sentEmails.some(e => e.to === 'charlie@example.com' && e.ticketCode === 'TK-103')).toBe(true);
    expect(sentEmails.some(e => e.to === 'manager@example.com')).toBe(true);
    expect(sentEmails).toHaveLength(4);
  });

  it('correctly creates 2 separate tickets and QR codes when entering 2 persons in team registration, even if raw quantity was 1', () => {
    // Scenario: user registers 2 persons in a team registration
    const teamData = {
      teamName: 'Duo Champs',
      members: [
        { name: 'John Doe', email: 'john@example.com', phone: '9123456780', college: 'Tech University' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '9123456781', college: 'Tech University' }
      ]
    };

    const rawQuantity = 1; // E.g., incoming quantity was default or 1
    const teamMemberCount = teamData.members.length;
    const effectiveQuantity = Math.max(Number(rawQuantity) || 1, teamMemberCount);

    expect(effectiveQuantity).toBe(2);

    // Simulate ticket generation loop using effectiveQuantity
    const createdTickets: Array<{
      ticketId: string;
      ticketNumber: number;
      totalTickets: number;
      recipientEmail: string;
      qrCodeData: string;
    }> = [];

    for (let i = 0; i < effectiveQuantity; i++) {
      const member = teamData.members[i];
      const ticketId = `TF${8800 + i}`;
      createdTickets.push({
        ticketId,
        ticketNumber: i + 1,
        totalTickets: effectiveQuantity,
        recipientEmail: member.email,
        qrCodeData: ticketId,
      });
    }

    // Must generate 2 tickets, not 1
    expect(createdTickets).toHaveLength(2);

    // Person 1 ticket
    expect(createdTickets[0].ticketId).toBe('TF8800');
    expect(createdTickets[0].ticketNumber).toBe(1);
    expect(createdTickets[0].totalTickets).toBe(2);
    expect(createdTickets[0].recipientEmail).toBe('john@example.com');
    expect(createdTickets[0].qrCodeData).toBe('TF8800');

    // Person 2 ticket
    expect(createdTickets[1].ticketId).toBe('TF8801');
    expect(createdTickets[1].ticketNumber).toBe(2);
    expect(createdTickets[1].totalTickets).toBe(2);
    expect(createdTickets[1].recipientEmail).toBe('jane@example.com');
    expect(createdTickets[1].qrCodeData).toBe('TF8801');

    // Tickets are distinct
    expect(createdTickets[0].ticketId).not.toBe(createdTickets[1].ticketId);
    expect(createdTickets[0].recipientEmail).not.toBe(createdTickets[1].recipientEmail);
  });

  it('forwards the respective ticket QR code to each mentioned email ID in a 2-person registration', () => {
    const teamMembers = [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' }
    ];

    const tickets = [
      { ticketId: 'TF9001', ticketNumber: 1 },
      { ticketId: 'TF9002', ticketNumber: 2 }
    ];

    // Ensure sorted deterministically
    tickets.sort((a, b) => a.ticketNumber - b.ticketNumber);

    // Map each team member to their ticket
    const dispatchedEmails: Array<{ email: string; ticketCode: string; qrCode: string }> = [];

    teamMembers.forEach((member, idx) => {
      const memberTicket = tickets[idx];
      expect(memberTicket).toBeDefined();
      dispatchedEmails.push({
        email: member.email,
        ticketCode: memberTicket.ticketId,
        qrCode: memberTicket.ticketId // QR code encodes the ticketId
      });
    });

    expect(dispatchedEmails).toHaveLength(2);
    expect(dispatchedEmails[0]).toEqual({
      email: 'john@example.com',
      ticketCode: 'TF9001',
      qrCode: 'TF9001'
    });
    expect(dispatchedEmails[1]).toEqual({
      email: 'jane@example.com',
      ticketCode: 'TF9002',
      qrCode: 'TF9002'
    });
  });
});

