import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { sendTicketsToAllTeamMembers, sendOrderConfirmationEmail } from '@/lib/email-utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import axios from 'axios';

const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg";

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

// Send free ticket emails
async function sendFreeTicketEmail(orderId: string, orderData: {
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
}) {
  try {
    // Get event details
    const eventDoc = await db.collection('events').doc(orderData.eventId).get();
    const eventData = eventDoc.data()!;

    // Get all tickets for this order
    const ticketsSnapshot = await db.collection('tickets')
      .where('orderId', '==', orderId)
      .get();

    const tickets = ticketsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TicketData[];

    if (orderData.teamData?.members && tickets.length > 1) {
      // Team registration
      const teamMembers = tickets.map((ticket) => ({
        name: ticket.teamInfo?.memberName || ticket.customerDetails?.name || 'Team Member',
        email: ticket.teamInfo?.memberEmail || ticket.customerDetails?.email || 'unknown@email.com',
        ticketCode: ticket.ticketId
      }));

      const teamEmailData = {
        teamName: orderData.teamData.teamName || '',
        eventTitle: eventData.title,
        orderNumber: orderId,
        ticketPrice: 0,
        currency: eventData.currency || 'INR',
        eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
        eventVenue: eventData.venue?.name || 'Event Venue',
        members: teamMembers
      };

      await sendTicketsToAllTeamMembers(teamEmailData);
    } else {
      // Individual registration
      const mainTicket = tickets[0];
      if (mainTicket) {
        const recipientEmail = mainTicket.teamInfo?.memberEmail || mainTicket.customerDetails?.email || 'unknown@email.com';
        const recipientName = mainTicket.teamInfo?.memberName || mainTicket.customerDetails?.name || 'Participant';

        await sendOrderConfirmationEmail({
          customerEmail: recipientEmail,
          customerName: recipientName,
          eventTitle: eventData.title,
          orderNumber: orderId,
          ticketPrice: 0,
          currency: eventData.currency || 'INR',
          eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
          eventVenue: eventData.venue?.name || 'Event Venue',
          ticketCode: mainTicket.ticketId,
          isIndividualTicket: true
        });
      }
    }
  } catch (error: unknown) {
    console.error("Error sending free tickets:", error);
    throw error;
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
        const ticketId = `ticket_${orderId}_${i + 1}`;
        const memberData = teamData?.members?.[i] || null;

        const ticketData: Record<string, unknown> = {
          ticketId,
          orderId,
          eventId,
          userId,
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
            isTeamEvent: true
          };
        }

        await db.collection('tickets').doc(ticketId).set(ticketData);
        tickets.push(ticketData);
      }

      // Send email
      try {
        await sendFreeTicketEmail(orderId, {
          userId,
          eventId,
          quantity,
          ticketPrice: 0,
          totalAmount: 0,
          status: 'completed',
          eventTitle: eventData.title,
          eventDate: eventData.dateTime?.startDate,
          isFree: true,
          teamData
        });
      } catch {
        // Don't fail if email fails
      }

      return NextResponse.json({
        success: true,
        orderId,
        totalAmount: 0,
        isFree: true,
        tickets: tickets.length,
        message: 'Free tickets registered successfully!'
      });
    }

    // For PAID events - create Cashfree order
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:3000';
    const httpsBaseUrl = baseUrl.replace('http://', 'https://');

    const cashfreeOrderData = {
      order_id: orderId,
      order_amount: totalAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
      },
      order_meta: {
        return_url: `${httpsBaseUrl}/order/success?order_id=${orderId}`,
        notify_url: `${httpsBaseUrl}/api/payments/webhook`
      }
    };

    const orderResponse = await axios.post(
      `${CASHFREE_BASE_URL}/orders`,
      cashfreeOrderData,
      {
        headers: {
          'X-Client-Id': CASHFREE_CLIENT_ID,
          'X-Client-Secret': CASHFREE_CLIENT_SECRET,
          'Content-Type': 'application/json',
          'x-api-version': '2023-08-01'
        }
      }
    );

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
      customerDetails: { name: customerName, email: customerEmail, phone: customerPhone }
    };

    if (teamData?.members?.length > 0) {
      orderDocument.teamData = {
        teamName: teamData.teamName || '',
        members: teamData.members,
        isTeamEvent: true
      };
    }

    if (orderResponse.data.order_id) orderDocument.paymentGatewayId = orderResponse.data.order_id;
    if (orderResponse.data.order_token) orderDocument.cashfreeOrderToken = orderResponse.data.order_token;
    if (orderResponse.data.payment_session_id) orderDocument.paymentSessionId = orderResponse.data.payment_session_id;

    await db.collection('orders').doc(orderId).set(orderDocument);

    return NextResponse.json({
      success: true,
      orderId,
      orderToken: orderResponse.data.order_token || null,
      totalAmount,
      cashfreeOrderId: orderResponse.data.order_id || null,
      paymentSessionId: orderResponse.data.payment_session_id || null
    });

  } catch (error: unknown) {
    console.error("Error creating payment order:", error);
    const axiosError = error as { response?: { data?: { message?: string }; status?: number }; message?: string };
    return NextResponse.json(
      { error: `Failed to create payment order: ${axiosError.response?.data?.message || axiosError.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
}
