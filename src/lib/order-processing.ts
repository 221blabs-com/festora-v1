import { db } from './firebase-admin';
import { sendTicketsToAllTeamMembers, sendOrderConfirmationEmail } from './email-utils';
import { generateSimpleTicketId } from './ticket-id';
<<<<<<< HEAD
import { normalizeEmail, resolveMemberUserId } from './ticket-ownership';
=======
import { extractEventEmailDetails } from './event-email-helper';
>>>>>>> d4d8eef (add the talk expert page and remove github login page and add the add forms)
import type { Order, TeamMember } from '../types/firestore';

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
  teamSettings?: any;
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
}

interface LocalTicketData {
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

  // Count existing tickets
  const ticketsSnap = await db.collection('tickets').where('orderId', '==', orderId).get();
  if (ticketsSnap.size >= orderData.quantity && !ticketsSnap.empty) {
    const existingTickets = ticketsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      eventData
    }));
    return { alreadyProcessed: true, order: orderData, tickets: existingTickets, event: eventData };
  }

  // Update ticketsSold only once (if we haven't created full set yet)
  if (ticketsSnap.empty) {
    const currentSold = eventData.ticketsSold || 0;
    // For team events (like AIGNITE), increment by 1 per team, not per participant
    const isTeamEvent = orderData.teamData && orderData.teamData.members && orderData.teamData.members.length > 1;
    const incrementBy = isTeamEvent ? 1 : orderData.quantity;
    await eventRef.update({ ticketsSold: currentSold + incrementBy });
  }

  const teamMembers = (orderData.teamData?.members || []) as TeamMemberWithExtras[];
  const createdTickets: LocalTicketData[] = [];
  for (let i = 0; i < orderData.quantity; i++) {
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
    if (ticketExisting.exists) continue; // idempotent

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

    const ticketData = {
      ticketId,
      orderId,
      eventId: orderData.eventId,
      userId: ownerUserId,
      claimEmail: normalizeEmail(member.email),
      qrCodeData: ticketId,
      isCheckedIn: false,
      checkedInAt: null,
      createdAt: new Date(),
      ticketNumber: i + 1,
      totalTickets: orderData.quantity,
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
        customAnswers: (member as any).customAnswers || {},
        isTeamEvent: true,
        // Also store team-level college and department for backward compatibility
        college: orderData.teamData.college || '',
        department: orderData.teamData.department || ''
      } : null,
      gender: (member as any).gender || '',
      tshirtSize: (member as any).tshirtSize || '',
      customAnswers: (member as any).customAnswers || {},
      paymentStatus: 'completed',
      status: 'confirmed'
    };
    await ticketRef.set(ticketData);
    createdTickets.push(ticketData);
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
        }));

        await sendTicketsToAllTeamMembers({
          teamName: isTeam ? (orderData.teamData.teamName || 'Team') : undefined,
          eventTitle: details.eventTitle,
          orderNumber: orderId,
          ticketPrice: orderData.ticketPrice,
          currency: details.currency,
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
            eventDate: details.eventDate,
            eventTime: details.eventTime,
            eventEndDate: details.eventEndDate,
            eventVenue: details.eventVenue,
            ticketCode: createdTickets[0]?.ticketId || generateSimpleTicketId(eventData.title),
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
              eventDate: details.eventDate,
              eventTime: details.eventTime,
              eventEndDate: details.eventEndDate,
              eventVenue: details.eventVenue,
              ticketCode: ticket.ticketId,
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
