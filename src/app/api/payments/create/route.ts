import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { sendTicketsToAllTeamMembers, sendOrderConfirmationEmail } from '@/lib/email-utils';
import { generateSimpleTicketId } from '@/lib/ticket-id';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { normalizeEmail, resolveMemberUserId } from '@/lib/ticket-ownership';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

interface TeamMember {
  name?: string;
  email?: string;
  phone?: string;
  rollNumber?: string;
  year?: string;
  college?: string;
  department?: string;
}

interface TeamData {
  teamName?: string;
  members?: TeamMember[];
  college?: string;
  department?: string;
}

interface CustomerDetails {
  name?: string;
  email?: string;
  phone?: string;
}

interface TicketData {
  id: string;
  customerDetails?: CustomerDetails;
  teamInfo?: {
    memberEmail?: string;
    memberName?: string;
  };
  ticketId: string;
  [key: string]: unknown;
}

// Helper to send free ticket confirmation emails
async function sendFreeTicketEmail(
  orderId: string,
  orderData: {
    userId: string;
    eventId: string;
    quantity: number;
    ticketPrice: number;
    totalAmount: number;
    status: string;
    eventTitle?: string;
    eventDate?: string;
    isFree: boolean;
    teamData?: TeamData;
    customerEmail?: string;
    customerName?: string;
  },
  preloadedEventData?: any,
  preloadedTickets?: TicketData[]
): Promise<boolean> {
  try {
    // Use preloaded event data or query Firestore if not provided
    let eventData = preloadedEventData;
    if (!eventData) {
      const eventDoc = await db.collection('events').doc(orderData.eventId).get();
      eventData = eventDoc.data();
    }

    if (!eventData) {
      console.error('sendFreeTicketEmail: Event not found for id', orderData.eventId);
      return false;
    }

    // Use preloaded tickets or query Firestore if not provided
    let tickets: TicketData[] = preloadedTickets || [];
    if (!tickets || tickets.length === 0) {
      const ticketsSnapshot = await db.collection('tickets')
        .where('orderId', '==', orderId)
        .get();

      tickets = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TicketData[];
    }

    const getVenueName = (venue: unknown): string => {
      if (typeof venue === 'string') return venue;
      if (venue && typeof venue === 'object' && 'name' in venue) {
        return (venue as { name?: string }).name || 'Event Venue';
      }
      return 'Event Venue';
    };

    const deliveryResults: boolean[] = [];

    if (orderData.teamData?.members && orderData.teamData.members.length > 0) {
      // Team registration - send individual ticket to all team member emails
      const teamMembers = orderData.teamData.members.map((member, idx) => ({
        name: member.name || 'Team Member',
        email: (member.email || '').trim(),
        ticketCode: tickets[idx]?.ticketId || tickets[0]?.ticketId || 'TICKET'
      }));

      const teamEmailData = {
        teamName: orderData.teamData.teamName || 'Team',
        eventTitle: eventData.title,
        orderNumber: orderId,
        ticketPrice: 0,
        currency: eventData.currency || 'INR',
        eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
        eventVenue: getVenueName(eventData.venue),
        members: teamMembers
      };

      const teamResults = await sendTicketsToAllTeamMembers(teamEmailData);
      deliveryResults.push(...teamResults.map((r) => r.success));
    } else {
      // Individual registration - send each ticket to its attendee
      for (const ticket of tickets) {
        const recipientEmail = (
          ticket.customerDetails?.email ||
          ticket.teamInfo?.memberEmail ||
          orderData.customerEmail ||
          ''
        ).trim();
        const recipientName =
          ticket.customerDetails?.name ||
          ticket.teamInfo?.memberName ||
          orderData.customerName ||
          'Participant';

        if (recipientEmail && recipientEmail.includes('@')) {
          const result = await sendOrderConfirmationEmail({
            customerEmail: recipientEmail,
            customerName: recipientName,
            eventTitle: eventData.title,
            orderNumber: orderId,
            ticketPrice: 0,
            currency: eventData.currency || 'INR',
            eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
            eventVenue: getVenueName(eventData.venue),
            ticketCode: ticket.ticketId,
            isIndividualTicket: true,
            organizerName: eventData.organizer?.name || eventData.organizer?.contactName,
            organizerEmail: eventData.organizer?.email,
            organizerPhone: eventData.organizer?.phone,
            participantDetails: {
              phone: (ticket.customerDetails as any)?.phone || (orderData as any)?.customerPhone,
              rollNumber: (ticket.customerDetails as any)?.rollNumber || (ticket.teamInfo as any)?.memberRollNumber,
              year: (ticket.customerDetails as any)?.year || (ticket.teamInfo as any)?.memberYear,
              college: (ticket.customerDetails as any)?.college || (ticket.teamInfo as any)?.memberCollege || (ticket.teamInfo as any)?.college,
              department: (ticket.customerDetails as any)?.department || (ticket.teamInfo as any)?.memberDepartment || (ticket.teamInfo as any)?.department,
              customAnswers: (ticket.customerDetails as any)?.customAnswers,
            }
          });
          deliveryResults.push(result.success);
        } else {
          console.warn('sendFreeTicketEmail: skipping ticket send due to invalid email:', recipientEmail);
        }
      }
    }

    return deliveryResults.length > 0 && deliveryResults.every(Boolean);
  } catch (error: unknown) {
    console.error("Error sending free tickets email:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 payment creation attempts per minute per IP
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`payment-create:${ip}`, 5);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    // Get the Firebase ID token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json();
    const { eventId, quantity, teamData, customerDetails } = body;

    if (!eventId || !quantity || quantity < 1) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 });
    }

    // Get event details from Firestore
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data()!;

    // Check if user already has tickets for this event
    const existingTicketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .get();

    if (!existingTicketsSnapshot.empty) {
      return NextResponse.json({
        error: 'You already have tickets for this event. Each user can only register once per event.'
      }, { status: 400 });
    }

    // Also block re-registration via existing orders: team tickets are now
    // owned by their individual members rather than always the purchaser, so
    // the tickets check above can no longer catch a purchaser who registers
    // a team without including themselves as a member.
    const existingOrdersSnapshot = await db.collection('orders')
      .where('userId', '==', userId)
      .where('eventId', '==', eventId)
      .get();

    const hasActiveOrder = existingOrdersSnapshot.docs.some((doc) => {
      const status = doc.data().status;
      return status === 'completed' || status === 'pending';
    });

    if (hasActiveOrder) {
      return NextResponse.json({
        error: 'You already have a registration for this event. Each user can only register once per event.'
      }, { status: 400 });
    }

    const ticketPrice = eventData.ticketPrice || 0;
    const totalTickets = eventData.totalTickets || 0;
    const ticketsSold = eventData.ticketsSold || 0;
    const isPaid = eventData.isPaid;

    // Check availability
    if (totalTickets > 0 && ticketsSold + quantity > totalTickets) {
      return NextResponse.json({ error: 'Not enough tickets available' }, { status: 400 });
    }

    // Calculate total amount
    let baseAmount;
    if (eventData.id === 'AIGNITE' || eventData.title?.includes('AIGNITE')) {
      baseAmount = ticketPrice;
    } else {
      baseAmount = ticketPrice * quantity;
    }

    const gatewayFee = baseAmount > 0 ? baseAmount * 0.035 : 0;
    const totalAmount = Math.round((baseAmount + gatewayFee) * 100) / 100;

    const orderId = `order_${Date.now()}_${userId.substring(0, 8)}`;

    const customerName = customerDetails?.name || decodedToken.name || 'User';
    const customerEmail = customerDetails?.email || decodedToken.email || 'user@example.com';

    let customerPhone = customerDetails?.phone || decodedToken.phone_number || '';
    if (customerPhone) {
      customerPhone = customerPhone.replace(/\D/g, '');
      if (customerPhone.startsWith('91') && customerPhone.length === 12) {
        customerPhone = `+${customerPhone}`;
      } else if (customerPhone.length === 10 && customerPhone.match(/^[6-9]/)) {
        customerPhone = `+91${customerPhone}`;
      } else {
        customerPhone = '+919876543210';
      }
    } else {
      customerPhone = '+919876543210';
    }

    // Handle FREE events
    if (!isPaid || ticketPrice === 0) {
      const orderDocument: Record<string, unknown> = {
        userId,
        eventId,
        quantity,
        ticketPrice: 0,
        totalAmount: 0,
        status: 'completed',
        paymentCompletedAt: new Date(),
        createdAt: new Date(),
        eventTitle: eventData.title,
        eventDate: eventData.dateTime?.startDate,
        isFree: true,
        customerDetails: { name: customerName, email: customerEmail, phone: customerPhone }
      };

      if (teamData?.members?.length > 0) {
        orderDocument.teamData = {
          teamName: teamData.teamName || '',
          members: teamData.members,
          isTeamEvent: true
        };
      }

      await db.collection('orders').doc(orderId).set(orderDocument);
      await db.collection('events').doc(eventId).update({ ticketsSold: ticketsSold + quantity });

      // Create tickets
      const tickets = [];
      for (let i = 0; i < quantity; i++) {
        let ticketId = generateSimpleTicketId(eventData.title);
        let attempts = 0;
        while (attempts < 5) {
          const checkDoc = await db.collection('tickets').doc(ticketId).get();
          if (!checkDoc.exists) break;
          ticketId = generateSimpleTicketId(eventData.title);
          attempts++;
        }
        const memberData = teamData?.members?.[i] || null;

        // For team registrations, each ticket belongs to its own member, not
        // the purchaser - link it to their account if one already exists,
        // otherwise leave it unclaimed (by claimEmail) until they sign up/log in.
        const isTeamOrder = Boolean(teamData?.members?.length > 0);
        const ownerUserId = isTeamOrder
          ? await resolveMemberUserId(memberData?.email, userId, customerEmail)
          : userId;
        const memberEmailForClaim = memberData?.email || customerEmail;

        const ticketData: Record<string, unknown> = {
          ticketId,
          orderId,
          eventId,
          userId: ownerUserId,
          claimEmail: normalizeEmail(memberEmailForClaim),
          qrCodeData: ticketId,
          isCheckedIn: false,
          checkedInAt: null,
          createdAt: new Date(),
          ticketNumber: i + 1,
          totalTickets: quantity,
          customerDetails: {
            name: memberData?.name || customerName,
            email: memberData?.email || customerEmail,
            phone: memberData?.phone || customerPhone
          }
        };

        if (teamData?.members?.length > 0) {
          ticketData.teamInfo = {
            teamName: teamData.teamName || '',
            memberName: memberData?.name || '',
            memberEmail: memberData?.email || '',
            memberPhone: memberData?.phone || '',
            memberRollNumber: memberData?.rollNumber || '',
            memberYear: memberData?.year || '',
            memberSchool: memberData?.school || '',
            memberCollege: memberData?.school || memberData?.college || '',
            memberDepartment: memberData?.department || '',
            gender: (memberData as any)?.gender || '',
            tshirtSize: (memberData as any)?.tshirtSize || '',
            customAnswers: (memberData as any)?.customAnswers || {},
            isTeamEvent: true
          };
          ticketData.gender = (memberData as any)?.gender || '';
          ticketData.tshirtSize = (memberData as any)?.tshirtSize || '';
          ticketData.customAnswers = (memberData as any)?.customAnswers || {};
        }

        await db.collection('tickets').doc(ticketId).set(ticketData);
        tickets.push(ticketData);
      }

      // Send ticket confirmation email and await delivery so Vercel Serverless does not freeze execution
      let emailSent = false;
      try {
        emailSent = await sendFreeTicketEmail(
          orderId,
          {
            userId,
            eventId,
            quantity,
            ticketPrice: 0,
            totalAmount: 0,
            status: 'completed',
            eventTitle: eventData.title,
            eventDate: eventData.dateTime?.startDate,
            isFree: true,
            teamData,
            customerEmail,
            customerName,
          },
          eventData,
          tickets as TicketData[]
        );
      } catch (emailErr) {
        console.error('Free ticket email error:', emailErr);
      }

      // A registration is never invalidated by an email hiccup - the ticket
      // is already saved either way - but the frontend needs to know so it
      // can be honest with the attendee instead of promising an email that
      // never arrives.
      return NextResponse.json({
        success: true,
        orderId,
        totalAmount: 0,
        isFree: true,
        tickets: tickets.length,
        emailSent,
        message: 'Free tickets registered successfully!'
      });
    }

    // For PAID events - create Razorpay order
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

    if (!keyId || !keySecret) {
      console.error('Razorpay keys missing from environment');
      return NextResponse.json(
        { error: 'Payment gateway configuration error. Please contact administrator.' },
        { status: 500 }
      );
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // Amount in paise
      currency: 'INR',
      receipt: orderId,
      notes: {
        orderId,
        eventId,
        userId,
        customerName: customerName || '',
        customerEmail: customerEmail || '',
        customerPhone: customerPhone || '',
        eventTitle: String(eventData.title || '')
      }
    });

    const orderDocument: Record<string, unknown> = {
      userId,
      eventId,
      quantity,
      ticketPrice,
      baseAmount,
      gatewayFee,
      totalAmount,
      status: 'pending',
      createdAt: new Date(),
      eventTitle: eventData.title,
      eventDate: eventData.dateTime?.startDate,
      customerDetails: { name: customerName, email: customerEmail, phone: customerPhone },
      paymentGateway: 'razorpay',
      paymentGatewayId: razorpayOrder.id,
      razorpayOrderId: razorpayOrder.id
    };

    if (teamData?.members && teamData.members.length > 0) {
      orderDocument.teamData = {
        teamName: teamData.teamName || '',
        members: teamData.members,
        isTeamEvent: true
      };
    }

    await db.collection('orders').doc(orderId).set(orderDocument);

    return NextResponse.json({
      success: true,
      orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: keyId,
      totalAmount
    });

  } catch (error: unknown) {
    console.error("Error creating payment order:", error);
    const err = error as { description?: string; error?: { description?: string }; message?: string };
    const errMsg = err.error?.description || err.description || err.message || 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create payment order: ${errMsg}` },
      { status: 500 }
    );
  }
}
