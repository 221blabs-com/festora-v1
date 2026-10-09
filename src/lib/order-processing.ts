import { db } from './firebase-admin';
import { sendTicketsToAllTeamMembers, sendOrderConfirmationEmail } from './email-utils';
import { generateSimpleTicketId } from './ticket-id';
import { normalizeEmail, resolveMemberUserId } from './ticket-ownership';
import { extractEventEmailDetails } from './event-email-helper';
import type { Order, TeamMember, DayTicketPass } from '../types/firestore';
import { autoIssueDynamicQrsForTickets } from './dynamic-qr-service';
import {
  getEffectiveRegistrationFields,
  DynamicRegistrationField,
  DynamicFieldAnswer,
  EventDay
} from '../types/event';

interface OrderWithDetails extends Order {
  customerDetails?: {
    name: string;
    email: string;
    phone?: string;
  };
}

interface EventWithDetails {
  title: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
  eventDate?: string;
  eventTime?: string;
  startTime?: string;
  endTime?: string;
  dateTime?: {
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
  };
  venue?: {
    name?: string;
    address?: string;
  } | string;
  location?: any;
  ticketsSold?: number;
  organizationName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  organizer?: {
    name?: string;
    email?: string;
    contactName?: string;
    phone?: string;
  } | string;
  isTeamEvent?: boolean;
  registrationFields?: any;
  isMultiDay?: boolean;
  eventDays?: Array<{ dayNumber: number; date: string; startTime?: string; endTime?: string; title?: string }>;
}

interface TeamMemberWithExtras extends TeamMember {
  rollNumber?: string;
  year?: string;
  school?: string;
  college?: string;
  department?: string;
  gender?: string;
  tshirtSize?: string;
  customAnswers?: Record<string, string>;
  registrationAnswers?: DynamicFieldAnswer[];
}

interface LocalTicketData {
  id?: string;
  ticketId: string;
  orderId: string;
  eventId: string;
  userId: string | null;
  claimEmail: string;
  qrCodeData: string;
  isCheckedIn: boolean;
  checkedInAt: null;
  createdAt: Date;
  ticketNumber: number;
  totalTickets: number;
  customerDetails: {
    name: string;
    email: string;
    phone?: string;
  };
  teamInfo: {
    teamName: string;
    memberName: string;
    memberEmail: string;
    memberPhone?: string;
    memberRollNumber?: string;
    memberYear?: string;
    memberCollege?: string;
    memberDepartment?: string;
    gender?: string;
    tshirtSize?: string;
    customAnswers?: Record<string, string>;
    isTeamEvent: boolean;
    college?: string;
    department?: string;
  } | null;
  paymentStatus: string;
  status: string;
  dayTickets?: any[];
}

/**
 * Idempotent order processing: creates tickets & sends emails only if not already done.
 */
export async function processPaidOrder(orderId: string) {
  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();
  if (!orderSnap.exists) throw new Error('Order not found');
  const orderData = orderSnap.data() as OrderWithDetails;

  // Mark as completed if not yet
  if (orderData.status !== 'completed') {
    await orderRef.update({ status: 'completed', paymentCompletedAt: new Date() });
  }

  // Re-fetch event for ticket counts
  const eventRef = db.collection('events').doc(orderData.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new Error('Event not found');
  const eventData = eventSnap.data() as EventWithDetails;

  // Extract complete event, date, time, venue, and organizer details
  const details = extractEventEmailDetails(eventData);

  const teamMembers = (orderData.teamData?.members || []) as TeamMemberWithExtras[];
  const effectiveQuantity = Math.max(Number(orderData.quantity) || 1, teamMembers.length);

  // Count existing tickets
  const ticketsSnap = await db.collection('tickets').where('orderId', '==', orderId).get();
  if (ticketsSnap.size >= effectiveQuantity && !ticketsSnap.empty) {
    const existingTickets = ticketsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      eventData
    }));
    existingTickets.sort((a: any, b: any) => (a.ticketNumber || 0) - (b.ticketNumber || 0));
    return { alreadyProcessed: true, order: orderData, tickets: existingTickets, event: eventData };
  }

  // Update ticketsSold only once (if we haven't created full set yet)
  if (ticketsSnap.empty) {
    const currentSold = eventData.ticketsSold || 0;
    const incrementBy = effectiveQuantity;
    await eventRef.update({ ticketsSold: currentSold + incrementBy });
  }

  // Pre-load existing tickets by ticketNumber to prevent duplicate creation on retry
  const existingByNumber = new Map<number, LocalTicketData>();
  ticketsSnap.docs.forEach(doc => {
    const d = doc.data() as LocalTicketData;
    const num = typeof d.ticketNumber === 'number' ? d.ticketNumber : 1;
    existingByNumber.set(num, { id: doc.id, ...d });
  });

  const createdTickets: LocalTicketData[] = [];
  for (let i = 0; i < effectiveQuantity; i++) {
    const ticketNumber = i + 1;
    if (existingByNumber.has(ticketNumber)) {
      createdTickets.push(existingByNumber.get(ticketNumber)!);
      continue;
    }

    // Generate clean 6-digit ticket ID (2 letters of event name + 4 digit number, e.g. "TF4821")
    let ticketId = generateSimpleTicketId(eventData.title);
    let attempts = 0;
    while (attempts < 5) {
      const checkDoc = await db.collection('tickets').doc(ticketId).get();
      if (!checkDoc.exists) break;
      ticketId = generateSimpleTicketId(eventData.title);
      attempts++;
    }

    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticketExisting = await ticketRef.get();
    if (ticketExisting.exists) {
      createdTickets.push({ id: ticketExisting.id, ...ticketExisting.data() } as any);
      continue;
    }

    const member = teamMembers[i] || {
      name: orderData.customerDetails?.name || 'Participant',
      email: orderData.customerDetails?.email || 'unknown@email.com',
      phone: orderData.customerDetails?.phone || null
    };

    // For team registrations, each ticket belongs to its own member - never
    // lump every member's ticket under the purchaser's account. If that
    // member already has an account, link it now; otherwise leave it
    // unclaimed (by claimEmail) until they create one or log in.
    const isTeamOrder = teamMembers.length > 0;
    const ownerUserId = isTeamOrder
      ? await resolveMemberUserId(member.email, orderData.userId, orderData.customerDetails?.email)
      : orderData.userId;

    const effectiveFields = getEffectiveRegistrationFields(eventData.registrationFields);

    // Resolve or construct registrationAnswers
    const memberCustomAnswers = (member as any).customAnswers || {};
    const memberRegAnswers: DynamicFieldAnswer[] = Array.isArray(member.registrationAnswers) && member.registrationAnswers.length > 0
      ? member.registrationAnswers
      : effectiveFields.map(f => {
          const ans = memberCustomAnswers[f.id] ?? memberCustomAnswers[f.label] ?? (member as any)[f.id] ?? (member as any)[f.label] ?? '';
          return {
            fieldId: f.id,
            field_id: f.id,
            label: f.label,
            answer: ans,
            showOnTicket: f.showOnTicket,
            show_on_ticket: f.showOnTicket,
            fieldType: f.type,
            field_type: f.type
          };
        });

    // Support multi-day events: generate day-specific QR passes
    const isMultiDay = Boolean(eventData.isMultiDay && Array.isArray(eventData.eventDays) && eventData.eventDays.length > 1);
    const dayTickets: DayTicketPass[] | undefined = isMultiDay && Array.isArray(eventData.eventDays)
      ? eventData.eventDays.map((d: any) => ({
          dayNumber: d.dayNumber,
          dayDate: d.date,
          passCode: `${ticketId}-D${d.dayNumber}`,
          qrCodeData: `${ticketId}-D${d.dayNumber}`,
          isCheckedIn: false,
        }))
      : undefined;

    const ticketData = {
      ticketId,
      orderId,
      eventId: orderData.eventId,
      userId: ownerUserId,
      purchaserUserId: orderData.userId || null,
      claimEmail: normalizeEmail(member.email),
      qrCodeData: ticketId,
      isCheckedIn: false,
      checkedInAt: null,
      dayTickets, // Multi-day day-specific QR tickets
      createdAt: new Date(),
      ticketNumber,
      totalTickets: effectiveQuantity,
      customerDetails: {
        name: member.name,
        email: member.email,
        phone: member.phone
      },
      teamInfo: orderData.teamData ? {
        teamName: orderData.teamData.teamName || '',
        memberName: member.name,
        memberEmail: member.email,
        memberPhone: member.phone,
        memberRollNumber: member.rollNumber || '',
        memberYear: member.year || '',
        memberSchool: member.school || '',
        memberCollege: member.school || member.college || '',
        memberDepartment: member.department || '',
        gender: (member as any).gender || '',
        tshirtSize: (member as any).tshirtSize || '',
        customAnswers: memberCustomAnswers,
        registrationAnswers: memberRegAnswers,
        isTeamEvent: true,
        college: orderData.teamData.college || '',
        department: orderData.teamData.department || ''
      } : null,
      gender: (member as any).gender || '',
      tshirtSize: (member as any).tshirtSize || '',
      customAnswers: memberCustomAnswers,
      registrationAnswers: memberRegAnswers,
      registration_field_answers: memberRegAnswers,
      fieldConfigs: effectiveFields,
      passInfo: orderData.teamData?.passId || orderData.teamData?.passName ? {
        passId: orderData.teamData.passId,
        passName: orderData.teamData.passName,
        passPrice: orderData.teamData.passPrice,
        badgeText: orderData.teamData.badgeText
      } : undefined,
      pricingSnapshot: {
        ticketPrice: orderData.teamData?.passPrice !== undefined ? orderData.teamData.passPrice : orderData.ticketPrice,
        baseAmount: orderData.baseAmount,
        platformFee: orderData.platformFee,
        totalAmount: orderData.totalAmount
      },
      price: orderData.teamData?.passPrice !== undefined ? orderData.teamData.passPrice : (orderData.ticketPrice || 0),
      totalAmount: orderData.totalAmount || 0,
      paymentStatus: 'completed',
      status: 'confirmed'
    };
    await ticketRef.set(ticketData);

    // Also persist answers into registration_field_answers collection
    try {
      const batch = db.batch();
      for (const ans of memberRegAnswers) {
        const ansDocRef = db.collection('registration_field_answers').doc(`${ticketId}_${ans.fieldId}`);
        batch.set(ansDocRef, {
          id: `${ticketId}_${ans.fieldId}`,
          registration_id: orderId,
          ticket_id: ticketId,
          field_id: ans.fieldId,
          label: ans.label,
          answer: ans.answer,
          show_on_ticket: Boolean(ans.showOnTicket ?? ans.show_on_ticket),
          created_at: new Date()
        });
      }
      await batch.commit();
    } catch (ansErr) {
      console.warn('Could not batch save registration_field_answers:', ansErr);
    }

    createdTickets.push(ticketData as any);
  }

  // Auto-issue any active Dynamic QRs configured for this event (Food Coupon, Workshop Pass, etc.)
  try {
    await autoIssueDynamicQrsForTickets(orderData.eventId, eventData, createdTickets, orderData);
  } catch (dqrErr) {
    console.warn('Could not auto-issue dynamic QRs:', dqrErr);
  }

  // Send emails so attendees receive ticket confirmations with scan-ready QR codes
  if (createdTickets.length > 0) {
    try {
      const isTeam = Boolean(
        (orderData.teamData?.members && orderData.teamData.members.length > 1) ||
        (orderData.teamData?.teamName && orderData.teamData.teamName.toLowerCase() !== 'team') ||
        details.isTeamEvent
      );

      if (orderData.teamData?.members && teamMembers.length > 0) {
        // Team registration - send individual ticket with complete details to all mentioned team member emails
        const membersForEmail = teamMembers.map((m: TeamMemberWithExtras, idx: number) => ({
          name: m.name || orderData.customerDetails?.name || `Participant ${idx + 1}`,
          email: (m.email || orderData.customerDetails?.email || '').trim(),
          ticketCode: createdTickets[idx]?.ticketId || generateSimpleTicketId(eventData.title),
          phone: m.phone,
          rollNumber: m.rollNumber,
          year: m.year,
          college: m.college || m.school || orderData.teamData?.college,
          department: m.department || orderData.teamData?.department,
          gender: (m as any).gender,
          tshirtSize: (m as any).tshirtSize,
          customAnswers: (m as any).customAnswers,
          dayTickets: createdTickets[idx]?.dayTickets,
        }));

        await sendTicketsToAllTeamMembers({
          teamName: isTeam ? (orderData.teamData.teamName || 'Team') : undefined,
          eventTitle: details.eventTitle,
          orderNumber: orderId,
          ticketPrice: orderData.teamData?.passPrice !== undefined ? orderData.teamData.passPrice : orderData.ticketPrice,
          currency: details.currency,
          platformFee: orderData.platformFee,
          totalAmount: orderData.totalAmount,
          eventDate: details.eventDate,
          eventTime: details.eventTime,
          eventEndDate: details.eventEndDate,
          eventVenue: details.eventVenue,
          organizerName: details.organizerName,
          organizerEmail: details.organizerEmail,
          organizerPhone: details.organizerPhone,
          members: membersForEmail
        });

        // Also check if purchaser email is distinct from all team members
        const purchaserEmail = (orderData.customerDetails?.email || '').trim().toLowerCase();
        const memberEmails = new Set(membersForEmail.map(m => m.email.toLowerCase()));
        if (purchaserEmail && purchaserEmail.includes('@') && !memberEmails.has(purchaserEmail)) {
          await sendOrderConfirmationEmail({
            customerEmail: purchaserEmail,
            customerName: orderData.customerDetails?.name || 'Participant',
            eventTitle: details.eventTitle,
            orderNumber: orderId,
            ticketPrice: orderData.ticketPrice,
            currency: details.currency,
            platformFee: orderData.platformFee,
            totalAmount: orderData.totalAmount,
            eventDate: details.eventDate,
            eventTime: details.eventTime,
            eventEndDate: details.eventEndDate,
            eventVenue: details.eventVenue,
            ticketCode: createdTickets[0]?.ticketId || generateSimpleTicketId(eventData.title),
            dayTickets: createdTickets[0]?.dayTickets,
            teamName: isTeam ? orderData.teamData.teamName : undefined,
            isIndividualTicket: !isTeam,
            organizerName: details.organizerName,
            organizerEmail: details.organizerEmail,
            organizerPhone: details.organizerPhone,
          });
        }
      } else {
        // Individual tickets - send an email for each ticket created
        for (let i = 0; i < createdTickets.length; i++) {
          const ticket = createdTickets[i];
          const recipientEmail = (ticket.customerDetails?.email || orderData.customerDetails?.email || '').trim();
          const recipientName = ticket.customerDetails?.name || orderData.customerDetails?.name || 'Participant';

          if (recipientEmail && recipientEmail.includes('@')) {
            await sendOrderConfirmationEmail({
              customerEmail: recipientEmail,
              customerName: recipientName,
              eventTitle: details.eventTitle,
              orderNumber: orderId,
              ticketPrice: orderData.ticketPrice,
              currency: details.currency,
              platformFee: orderData.platformFee,
              totalAmount: orderData.totalAmount,
              eventDate: details.eventDate,
              eventTime: details.eventTime,
              eventEndDate: details.eventEndDate,
              eventVenue: details.eventVenue,
              ticketCode: ticket.ticketId,
              dayTickets: ticket.dayTickets,
              isIndividualTicket: true,
              organizerName: details.organizerName,
              organizerEmail: details.organizerEmail,
              organizerPhone: details.organizerPhone,
              participantDetails: ticket.teamInfo ? {
                phone: ticket.customerDetails?.phone,
                rollNumber: ticket.teamInfo.memberRollNumber,
                year: ticket.teamInfo.memberYear,
                college: ticket.teamInfo.memberCollege || ticket.teamInfo.college,
                department: ticket.teamInfo.memberDepartment || ticket.teamInfo.department,
                gender: ticket.teamInfo.gender,
                tshirtSize: ticket.teamInfo.tshirtSize,
                customAnswers: ticket.teamInfo.customAnswers,
              } : {
                phone: ticket.customerDetails?.phone || orderData.customerDetails?.phone,
                rollNumber: (ticket.customerDetails as any)?.rollNumber || (orderData.customerDetails as any)?.rollNumber,
                year: (ticket.customerDetails as any)?.year || (orderData.customerDetails as any)?.year,
                college: (ticket.customerDetails as any)?.college || (orderData.customerDetails as any)?.college,
                department: (ticket.customerDetails as any)?.department || (orderData.customerDetails as any)?.department,
                gender: (ticket.customerDetails as any)?.gender,
                tshirtSize: (ticket.customerDetails as any)?.tshirtSize,
                customAnswers: (ticket.customerDetails as any)?.customAnswers,
              },
            });
          }
        }
      }
    } catch (e) {
      console.error('Email sending failed for order', orderId, e);
    }
  }

  const ticketsWithEvent = createdTickets.map(t => ({
    id: t.ticketId,
    ...t,
    eventData
  }));

  return {
    success: true,
    created: createdTickets.length,
    order: orderData,
    tickets: ticketsWithEvent,
    event: eventData
  };
}
