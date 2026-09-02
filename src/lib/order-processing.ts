import { db } from './firebase-admin';
import { sendTicketsToAllTeamMembers, sendOrderConfirmationEmail } from './email-utils';
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
  userId: string;
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

  if (orderData.status === 'completed') {
    // Check if tickets already exist
    const existingTickets = await db.collection('tickets').where('orderId', '==', orderId).limit(1).get();
    if (!existingTickets.empty) {
      return { alreadyProcessed: true, order: orderData };
    }
  }

  // Mark as completed if not yet
  if (orderData.status !== 'completed') {
    await orderRef.update({ status: 'completed', paymentCompletedAt: new Date() });
  }

  // Re-fetch event for ticket counts
  const eventRef = db.collection('events').doc(orderData.eventId);
  const eventSnap = await eventRef.get();
  if (!eventSnap.exists) throw new Error('Event not found');
  const eventData = eventSnap.data() as EventWithDetails;

  // Count existing tickets
  const ticketsSnap = await db.collection('tickets').where('orderId', '==', orderId).get();
  if (ticketsSnap.size === orderData.quantity) {
    return { alreadyProcessed: true, order: orderData };
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
    const ticketId = `ticket_${orderId}_${i + 1}`;
    const ticketRef = db.collection('tickets').doc(ticketId);
    const ticketExisting = await ticketRef.get();
    if (ticketExisting.exists) continue; // idempotent

    const member = teamMembers[i] || {
      name: orderData.customerDetails?.name || 'Participant',
      email: orderData.customerDetails?.email || 'unknown@email.com',
      phone: orderData.customerDetails?.phone || null
    };

    const ticketData = {
      ticketId,
      orderId,
      eventId: orderData.eventId,
      userId: orderData.userId,
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
        isTeamEvent: true,
        // Also store team-level college and department for backward compatibility
        college: orderData.teamData.college || '',
        department: orderData.teamData.department || ''
      } : null,
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

  // Send emails (only if we created any tickets now)
  if (createdTickets.length > 0) {
    try {
      if (orderData.teamData && teamMembers.length > 1) {
        const membersForEmail = teamMembers.map((m: TeamMemberWithExtras, idx: number) => ({
          name: m.name || 'Team Member',
            email: m.email || 'unknown@email.com',
            ticketCode: `ticket_${orderId}_${idx + 1}`
        }));
        await sendTicketsToAllTeamMembers({
          teamName: orderData.teamData.teamName || 'Team',
          eventTitle: eventData.title,
          orderNumber: orderId,
          ticketPrice: orderData.ticketPrice,
          currency: eventData.currency || 'INR',
          eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
          eventVenue: getVenueName(eventData.venue),
          members: membersForEmail
        });
      } else {
        await sendOrderConfirmationEmail({
          customerEmail: orderData.customerDetails?.email || 'unknown@email.com',
          customerName: orderData.customerDetails?.name || 'Participant',
          eventTitle: eventData.title,
          orderNumber: orderId,
          ticketPrice: orderData.ticketPrice,
          currency: eventData.currency || 'INR',
          eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
          eventVenue: getVenueName(eventData.venue),
          ticketCode: `ticket_${orderId}_1`,
          isIndividualTicket: true
        });
      }
    } catch (e) {
      console.error('Email sending failed for order', orderId, e);
    }
  }

  return { success: true, created: createdTickets.length };
}
