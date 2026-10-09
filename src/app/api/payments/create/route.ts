import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { sendTicketsToAllTeamMembers, sendOrderConfirmationEmail } from '@/lib/email-utils';
import { generateSimpleTicketId } from '@/lib/ticket-id';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { normalizeEmail, resolveMemberUserId } from '@/lib/ticket-ownership';
import { extractEventEmailDetails } from '@/lib/event-email-helper';
import { getEffectiveRegistrationFields, DynamicFieldAnswer } from '@/types/event';
import { autoIssueDynamicQrsForTickets } from '@/lib/dynamic-qr-service';
import Razorpay from 'razorpay';

export const dynamic = 'force-dynamic';

interface TeamMember {
  name?: string;
  email?: string;
  phone?: string;
  rollNumber?: string;
  year?: string;
  school?: string;
  college?: string;
  department?: string;
  gender?: string;
  tshirtSize?: string;
  customAnswers?: Record<string, string>;
  registrationAnswers?: DynamicFieldAnswer[];
  [key: string]: unknown;
}

interface TeamData {
  teamName?: string;
  members?: TeamMember[];
  college?: string;
  department?: string;
  isTeamEvent?: boolean;
  numberOfEventDays?: number;
  passId?: string;
  passName?: string;
  passPrice?: number;
  badgeText?: string;
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
    memberPhone?: string;
    memberRollNumber?: string;
    memberYear?: string;
    memberCollege?: string;
    memberDepartment?: string;
    gender?: string;
    tshirtSize?: string;
    customAnswers?: Record<string, string>;
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
    customerPhone?: string;
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

    // Extract complete, normalized event, date, time, venue, and organizer details
    const details = extractEventEmailDetails(eventData);

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

    // Sort tickets by ticketNumber so tickets[idx] aligns deterministically with team member idx
    tickets.sort((a: any, b: any) => (a.ticketNumber || 0) - (b.ticketNumber || 0));

    const isTeam = Boolean(
      (orderData.teamData?.members && orderData.teamData.members.length > 1) ||
      (orderData.teamData?.teamName && orderData.teamData.teamName.toLowerCase() !== 'team') ||
      details.isTeamEvent
    );

    const deliveryResults: boolean[] = [];

    if (orderData.teamData?.members && orderData.teamData.members.length > 0) {
      // Send individual ticket with complete participant details to all mentioned email ids
      const teamMembers = orderData.teamData.members.map((member, idx) => ({
        name: member.name || 'Participant',
        email: (member.email || '').trim(),
        ticketCode: tickets[idx]?.ticketId || generateSimpleTicketId(eventData.title),
        dayTickets: (tickets[idx] as any)?.dayTickets,
        phone: member.phone,
        rollNumber: member.rollNumber,
        year: member.year,
        college: member.college || member.school || orderData.teamData?.college,
        department: member.department || orderData.teamData?.department,
        gender: (member as any).gender,
        tshirtSize: (member as any).tshirtSize,
        customAnswers: (member as any).customAnswers,
      }));

      const teamEmailData = {
        teamName: isTeam ? (orderData.teamData.teamName || 'Team') : undefined,
        eventTitle: details.eventTitle,
        orderNumber: orderId,
        ticketPrice: 0,
        currency: details.currency,
        eventDate: details.eventDate,
        eventTime: details.eventTime,
        eventEndDate: details.eventEndDate,
        eventVenue: details.eventVenue,
        organizerName: details.organizerName,
        organizerEmail: details.organizerEmail,
        organizerPhone: details.organizerPhone,
        members: teamMembers
      };

      const teamResults = await sendTicketsToAllTeamMembers(teamEmailData);
      deliveryResults.push(...teamResults.map((r) => r.success));

      // If purchaser email is distinct from all team members, send order confirmation to purchaser
      const purchaserEmail = (orderData.customerEmail || '').trim().toLowerCase();
      const memberEmails = new Set(teamMembers.map(m => m.email.toLowerCase()));
      if (purchaserEmail && purchaserEmail.includes('@') && !memberEmails.has(purchaserEmail)) {
        await sendOrderConfirmationEmail({
          customerEmail: purchaserEmail,
          customerName: orderData.customerName || 'Participant',
          eventTitle: details.eventTitle,
          orderNumber: orderId,
          ticketPrice: 0,
          currency: details.currency,
          eventDate: details.eventDate,
          eventTime: details.eventTime,
          eventEndDate: details.eventEndDate,
          eventVenue: details.eventVenue,
          ticketCode: tickets[0]?.ticketId || 'TICKET',
          teamName: isTeam ? orderData.teamData.teamName : undefined,
          isIndividualTicket: !isTeam,
          organizerName: details.organizerName,
          organizerEmail: details.organizerEmail,
          organizerPhone: details.organizerPhone,
        });
      }
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
            eventTitle: details.eventTitle,
            orderNumber: orderId,
            ticketPrice: 0,
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
            participantDetails: {
              phone: (ticket.customerDetails as any)?.phone || ticket.teamInfo?.memberPhone || (orderData as any)?.customerPhone,
              rollNumber: (ticket.customerDetails as any)?.rollNumber || ticket.teamInfo?.memberRollNumber,
              year: (ticket.customerDetails as any)?.year || ticket.teamInfo?.memberYear,
              college: (ticket.customerDetails as any)?.college || ticket.teamInfo?.memberCollege,
              department: (ticket.customerDetails as any)?.department || ticket.teamInfo?.memberDepartment,
              gender: (ticket.customerDetails as any)?.gender || ticket.teamInfo?.gender,
              tshirtSize: (ticket.customerDetails as any)?.tshirtSize || ticket.teamInfo?.tshirtSize,
              customAnswers: (ticket.customerDetails as any)?.customAnswers || ticket.teamInfo?.customAnswers,
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

    // Determine authoritative effective ticket count:
    // If team registration is submitted, every member MUST receive an individual ticket pass
    const teamMemberCount = Array.isArray(teamData?.members) ? teamData.members.length : 0;
    const effectiveQuantity = Math.max(Number(quantity) || 1, teamMemberCount);

    if (!eventId || effectiveQuantity < 1) {
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
    if (totalTickets > 0 && ticketsSold + effectiveQuantity > totalTickets) {
      return NextResponse.json({ error: 'Not enough tickets available' }, { status: 400 });
    }

    // Calculate ticket base amount (supporting tiered pass pricing e.g. Solo ₹249, Duo ₹499, Early Bird ₹449/₹0)
    let baseAmount: number;
    const hasPassPrice = teamData?.passPrice !== undefined && teamData?.passPrice !== null && !isNaN(Number(teamData.passPrice));
    if (hasPassPrice) {
      baseAmount = Number(teamData!.passPrice);
    } else if (eventData.id === 'AIGNITE' || eventData.title?.includes('AIGNITE')) {
      baseAmount = ticketPrice;
    } else {
      baseAmount = ticketPrice * effectiveQuantity;
    }

    // Determine whether this purchase is paid
    const effectiveIsPaid = hasPassPrice ? baseAmount > 0 : (Boolean(isPaid) && ticketPrice > 0);

    // Authoritative Festora Platform Fee (Fixed Rupee Rule):
    // 1 person = ₹6, each additional person = +₹1 (5 + number_of_people)
    // One combined fee based on total number of people, NOT percentage, NOT per-ticket.
    const platformFee = (effectiveIsPaid && baseAmount > 0 && effectiveQuantity > 0) ? (5 + effectiveQuantity) : 0;
    const organizerAmount = baseAmount;
    const totalAmount = baseAmount + platformFee;

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
    if (!effectiveIsPaid || baseAmount === 0 || totalAmount === 0) {
      const orderDocument: Record<string, unknown> = {
        userId,
        eventId,
        quantity: effectiveQuantity,
        ticketPrice: 0,
        baseAmount: 0,
        platformFee: 0,
        organizerAmount: 0,
        totalAmount: 0,
        status: 'completed',
        paymentCompletedAt: new Date(),
        createdAt: new Date(),
        eventTitle: eventData.title,
        eventDate: eventData.dateTime?.startDate,
        isFree: true,
        customerDetails: { name: customerName, email: customerEmail, phone: customerPhone }
      };

      if (teamData?.members && teamData.members.length > 0) {
        orderDocument.teamData = {
          teamName: teamData.teamName || '',
          members: teamData.members,
          teamSize: effectiveQuantity,
          college: teamData.college,
          department: teamData.department,
          numberOfEventDays: teamData.numberOfEventDays,
          passId: teamData.passId,
          passName: teamData.passName,
          passPrice: teamData.passPrice,
          badgeText: teamData.badgeText,
          isTeamEvent: true
        };
      }

      await db.collection('orders').doc(orderId).set(orderDocument);
      await db.collection('events').doc(eventId).update({ ticketsSold: ticketsSold + effectiveQuantity });

      // Create tickets for each member/seat
      const tickets = [];
      for (let i = 0; i < effectiveQuantity; i++) {
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

        const effectiveFields = getEffectiveRegistrationFields(eventData.registrationFields);
        const memberCustomAnswers = (memberData as any)?.customAnswers || {};
        const memberRegAnswers: DynamicFieldAnswer[] = Array.isArray(memberData?.registrationAnswers) && memberData.registrationAnswers.length > 0
          ? memberData.registrationAnswers
          : effectiveFields.map(f => {
              const ans = memberCustomAnswers[f.id] ?? memberCustomAnswers[f.label] ?? (memberData as any)?.[f.id] ?? (memberData as any)?.[f.label] ?? '';
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
        const dayTickets = isMultiDay && Array.isArray(eventData.eventDays)
          ? eventData.eventDays.map((d: any) => ({
              dayNumber: d.dayNumber,
              dayDate: d.date,
              passCode: `${ticketId}-D${d.dayNumber}`,
              qrCodeData: `${ticketId}-D${d.dayNumber}`,
              isCheckedIn: false,
            }))
          : undefined;

        const ticketData: Record<string, unknown> = {
          ticketId,
          orderId,
          eventId,
          userId: ownerUserId,
          purchaserUserId: userId,
          claimEmail: normalizeEmail(memberEmailForClaim),
          qrCodeData: ticketId,
          isCheckedIn: false,
          checkedInAt: null,
          dayTickets,
          createdAt: new Date(),
          ticketNumber: i + 1,
          totalTickets: effectiveQuantity,
          customerDetails: {
            name: memberData?.name || customerName,
            email: memberData?.email || customerEmail,
            phone: memberData?.phone || customerPhone
          },
          registrationAnswers: memberRegAnswers,
          registration_field_answers: memberRegAnswers,
          customAnswers: memberCustomAnswers,
          fieldConfigs: effectiveFields,
          pricingSnapshot: {
            ticketPrice: 0,
            baseAmount: 0,
            platformFee: 0,
            totalAmount: 0
          },
          price: 0,
          totalAmount: 0
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
            customAnswers: memberCustomAnswers,
            registrationAnswers: memberRegAnswers,
            isTeamEvent: true
          };
          ticketData.gender = (memberData as any)?.gender || '';
          ticketData.tshirtSize = (memberData as any)?.tshirtSize || '';
          ticketData.customAnswers = memberCustomAnswers;
        }

        if (teamData?.passId || teamData?.passName) {
          ticketData.passInfo = {
            passId: teamData.passId,
            passName: teamData.passName,
            passPrice: teamData.passPrice,
            badgeText: teamData.badgeText
          };
        }

        await db.collection('tickets').doc(ticketId).set(ticketData);

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

        tickets.push(ticketData);
      }

      // Auto-issue any active Dynamic QRs configured for this event (Food Coupon, Workshop Pass, etc.)
      try {
        await autoIssueDynamicQrsForTickets(eventId, eventData, tickets, orderDocument);
      } catch (dqrErr) {
        console.warn('Could not auto-issue dynamic QRs for free registration:', dqrErr);
      }

      // Send ticket confirmation email and await delivery so Vercel Serverless does not freeze execution
      let emailSent = false;
      try {
        emailSent = await sendFreeTicketEmail(
          orderId,
          {
            userId,
            eventId,
            quantity: effectiveQuantity,
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
        ticketList: tickets,
        ticket: tickets[0] || null,
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
        quantity: effectiveQuantity.toString(),
        baseAmount: baseAmount.toString(),
        platformFee: platformFee.toString(),
        organizerAmount: organizerAmount.toString(),
        totalAmount: totalAmount.toString(),
        customerName: customerName || '',
        customerEmail: customerEmail || '',
        customerPhone: customerPhone || '',
        eventTitle: String(eventData.title || '')
      }
    });

    const orderDocument: Record<string, unknown> = {
      userId,
      eventId,
      quantity: effectiveQuantity,
      ticketPrice,
      baseAmount,
      platformFee,
      organizerAmount,
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
        teamSize: effectiveQuantity,
        college: teamData.college,
        department: teamData.department,
        numberOfEventDays: teamData.numberOfEventDays,
        passId: teamData.passId,
        passName: teamData.passName,
        passPrice: teamData.passPrice,
        badgeText: teamData.badgeText,
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
      baseAmount,
      platformFee,
      organizerAmount,
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
