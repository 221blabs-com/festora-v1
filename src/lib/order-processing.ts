import { FieldValue } from 'firebase-admin/firestore';
import { db } from './firebase-admin';
import { sendTicketsToAllTeamMembers, sendOrderConfirmationEmail } from './email-utils';
import { generateSimpleTicketId } from './ticket-id';
import { normalizeEmail, resolveMemberUserId } from './ticket-ownership';
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
  dateTime?: {
    startDate: string;
    endDate?: string;
  };
  venue?: {
    name?: string;
  } | string;
  ticketsSold?: number;
  organizer?: {
    name?: string;
    email?: string;
    contactName?: string;
    phone?: string;
  };
}

interface TeamMemberWithExtras extends TeamMember {
  rollNumber?: string;
  year?: string;
  school?: string;
  college?: string;
  department?: string;
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

  const eventRef = db.collection('events').doc(orderData.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new Error('Event not found');
  const eventData = eventSnap.data() as EventWithDetails;

  // Atomically claim ticket generation for this order. processPaidOrder can
  // legitimately be invoked concurrently for the same order (the Razorpay
  // webhook, the client's /api/payments/verify call, and /api/orders/confirm
  // can all race each other right after checkout) - a plain read-then-write
  // idempotency check lets two callers both see "no tickets yet" and both
  // create a full duplicate set of tickets. This transaction ensures only
  // one caller ever wins the claim, and the ticketsSold increment happens
  // exactly once alongside it.
  const claimed = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(orderRef);
    const data = snap.data() as OrderWithDetails;
    if (data.ticketsGenerated) return false;

    const currentSold = eventData.ticketsSold || 0;
    // For team events (like AIGNITE), increment by 1 per team, not per participant
    const isTeamEvent = data.teamData && data.teamData.members && data.teamData.members.length > 1;
    const incrementBy = isTeamEvent ? 1 : data.quantity;

    transaction.set(orderRef, {
      status: 'completed',
      paymentCompletedAt: data.paymentCompletedAt || new Date(),
      ticketsGenerated: true,
    }, { merge: true });
    transaction.update(eventRef, { ticketsSold: FieldValue.increment(incrementBy) });
    // Also apply the increment to our in-memory copy so `currentSold` above
    // stays correct if this function is ever called again for another order
    // within the same process before eventData is re-read.
    eventData.ticketsSold = currentSold + incrementBy;
    return true;
  });

  if (!claimed) {
    const ticketsSnap = await db.collection('tickets').where('orderId', '==', orderId).get();
    const existingTickets = ticketsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      eventData
    }));
    return { alreadyProcessed: true, order: orderData, tickets: existingTickets, event: eventData };
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

  // Helper to get venue name from string or object
  const getVenueName = (venue: EventWithDetails['venue']): string => {
    if (typeof venue === 'string') return venue;
    return venue?.name || 'Event Venue';
  };

  // Send emails so attendees receive ticket confirmations with scan-ready QR codes
  if (createdTickets.length > 0) {
    try {
      if (orderData.teamData?.members && teamMembers.length > 0) {
        // Team registration - send individual ticket with QR code to all mentioned team member emails
        const membersForEmail = teamMembers.map((m: TeamMemberWithExtras, idx: number) => ({
          name: m.name || orderData.customerDetails?.name || `Team Member ${idx + 1}`,
          email: (m.email || orderData.customerDetails?.email || '').trim(),
          ticketCode: createdTickets[idx]?.ticketId || generateSimpleTicketId(eventData.title)
        }));

        await sendTicketsToAllTeamMembers({
          teamName: orderData.teamData.teamName || 'Team',
          eventTitle: eventData.title,
          orderNumber: orderId,
          ticketPrice: orderData.ticketPrice,
          currency: eventData.currency || 'INR',
          eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
          eventVenue: getVenueName(eventData.venue),
          organizerName: eventData.organizer?.name || eventData.organizer?.contactName,
          organizerEmail: eventData.organizer?.email,
          organizerPhone: eventData.organizer?.phone,
          members: membersForEmail
        });

        // Also check if purchaser email is distinct from all team members
        const purchaserEmail = (orderData.customerDetails?.email || '').trim().toLowerCase();
        const memberEmails = new Set(membersForEmail.map(m => m.email.toLowerCase()));
        if (purchaserEmail && purchaserEmail.includes('@') && !memberEmails.has(purchaserEmail)) {
          await sendOrderConfirmationEmail({
            customerEmail: purchaserEmail,
            customerName: orderData.customerDetails?.name || 'Participant',
            eventTitle: eventData.title,
            orderNumber: orderId,
            ticketPrice: orderData.ticketPrice,
            currency: eventData.currency || 'INR',
            eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
            eventVenue: getVenueName(eventData.venue),
            ticketCode: createdTickets[0]?.ticketId || generateSimpleTicketId(eventData.title),
            teamName: orderData.teamData.teamName || 'Team',
            isIndividualTicket: false,
            organizerName: eventData.organizer?.name || eventData.organizer?.contactName,
            organizerEmail: eventData.organizer?.email,
            organizerPhone: eventData.organizer?.phone,
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
              eventTitle: eventData.title,
              orderNumber: orderId,
              ticketPrice: orderData.ticketPrice,
              currency: eventData.currency || 'INR',
              eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
              eventVenue: getVenueName(eventData.venue),
              ticketCode: ticket.ticketId,
              isIndividualTicket: true,
              organizerName: eventData.organizer?.name || eventData.organizer?.contactName,
              organizerEmail: eventData.organizer?.email,
              organizerPhone: eventData.organizer?.phone,
              participantDetails: ticket.teamInfo ? {
                phone: ticket.customerDetails?.phone,
                rollNumber: ticket.teamInfo.memberRollNumber,
                year: ticket.teamInfo.memberYear,
                college: ticket.teamInfo.memberCollege || ticket.teamInfo.college,
                department: ticket.teamInfo.memberDepartment || ticket.teamInfo.department,
              } : {
                phone: ticket.customerDetails?.phone || orderData.customerDetails?.phone,
                rollNumber: (ticket.customerDetails as any)?.rollNumber || (orderData.customerDetails as any)?.rollNumber,
                year: (ticket.customerDetails as any)?.year || (orderData.customerDetails as any)?.year,
                college: (ticket.customerDetails as any)?.college || (orderData.customerDetails as any)?.college,
                department: (ticket.customerDetails as any)?.department || (orderData.customerDetails as any)?.department,
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
