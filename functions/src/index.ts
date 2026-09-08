/**
 * Festora - Payment and Ticketing System
 * Firebase Cloud Functions with Cashfree and Brevo SMTP integration
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import * as crypto from "crypto";
import * as QRCode from "qrcode";
import * as nodemailer from "nodemailer";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
const auth = admin.auth(); // Add this missing auth initialization

setGlobalOptions({ maxInstances: 10 });

// Cashfree API configuration - must be set via environment variables
const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg"; // Production URL

if (!CASHFREE_CLIENT_ID || !CASHFREE_CLIENT_SECRET) {
  logger.error('Cashfree credentials not configured');
}

// Initialize Brevo SMTP transporter
const createBrevoTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.BREVO_API_KEY) {
    throw new Error('SMTP credentials not configured');
  }
  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.BREVO_API_KEY,
    },
  });
};

/**
 * Create Payment Order with your Cashfree credentials
 */
export const createPaymentOrder = onCall({
  cors: true,
  enforceAppCheck: false
}, async (request) => {
  try {
    const { eventId, quantity } = request.data;
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    if (!eventId || !quantity || quantity < 1) {
      throw new Error("Invalid request parameters");
    }

    // Get event details from Firestore
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error("Event not found");
    }

    const eventData = eventDoc.data()!;
    const ticketPrice = eventData.ticketPrice || 0;
    const totalTickets = eventData.totalTickets || 0;
    const ticketsSold = eventData.ticketsSold || 0;

    // Check availability
    if (ticketsSold + quantity > totalTickets) {
      throw new Error("Not enough tickets available");
    }

    // Round to 2 decimal places - Cashfree does NOT allow more than 2 decimal places
    const totalAmount = Math.round((ticketPrice * quantity) * 100) / 100;
    const orderId = `order_${Date.now()}_${userId.substring(0, 8)}`;

    // Create Cashfree payment order with your credentials
    const cashfreeOrderData = {
      order_id: orderId,
      order_amount: totalAmount,
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: request.auth?.token.email || "",
        customer_phone: "9999999999" // You should collect this from user profile
      },
      order_meta: {
        return_url: `http://localhost:3000/order/success?order_id=${orderId}`,
        notify_url: `https://${process.env.GCLOUD_PROJECT || 'heartfund-cf797'}.cloudfunctions.net/verifyPaymentWebhook`
      }
    };

    logger.info("Creating Cashfree order with data:", cashfreeOrderData);

    // Create order with Cashfree using your production credentials
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

    logger.info("Cashfree order response:", orderResponse.data);

    // Store order in Firestore
    await db.collection('orders').doc(orderId).set({
      userId,
      eventId,
      quantity,
      ticketPrice,
      totalAmount,
      paymentGatewayId: orderResponse.data.order_id,
      cashfreeOrderToken: orderResponse.data.order_token,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      eventTitle: eventData.title,
      eventDate: eventData.dateTime?.startDate
    });

    logger.info(`Payment order created: ${orderId}`, { userId, eventId, totalAmount });

    return {
      success: true,
      orderId,
      orderToken: orderResponse.data.order_token,
      totalAmount,
      cashfreeOrderId: orderResponse.data.order_id,
      paymentSessionId: orderResponse.data.payment_session_id
    };

  } catch (error: any) {
    logger.error("Error creating payment order:", error);
    throw new Error(`Failed to create payment order: ${error?.message || 'Unknown error'}`);
  }
});

/**
 * Verify Payment Webhook from Cashfree
 */
export const verifyPaymentWebhook = onRequest({
  cors: false
}, async (req, res): Promise<void> => {
  try {
    logger.info("Webhook received:", req.body);

    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const rawBody = JSON.stringify(req.body);

    // Verify Cashfree webhook signature with your secret
    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_CLIENT_SECRET)
      .update(timestamp + rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      logger.error("Invalid webhook signature");
      res.status(400).send("Invalid signature");
      return;
    }

    const { data } = req.body;
    const { order } = data;
    const { order_id, order_status, payment_status } = order;

    logger.info(`Webhook received for order: ${order_id}`, { order_status, payment_status });

    // Find the order in Firestore
    const orderDoc = await db.collection('orders').doc(order_id).get();
    if (!orderDoc.exists) {
      logger.error(`Order not found: ${order_id}`);
      res.status(404).send("Order not found");
      return;
    }

    const orderData = orderDoc.data()!;

    if (payment_status === 'SUCCESS' && order_status === 'PAID') {
      // Process successful payment
      await db.runTransaction(async (transaction) => {
        // Update order status
        transaction.update(orderDoc.ref, {
          status: 'completed',
          paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
          cashfreePaymentId: order.cf_payment_id
        });

        // Update event tickets sold
        const eventRef = db.collection('events').doc(orderData.eventId);
        const eventDoc = await transaction.get(eventRef);
        const currentTicketsSold = eventDoc.data()?.ticketsSold || 0;

        transaction.update(eventRef, {
          ticketsSold: currentTicketsSold + orderData.quantity
        });

        // Create tickets
        for (let i = 0; i < orderData.quantity; i++) {
          const ticketId = `ticket_${order_id}_${i + 1}`;
          const ticketRef = db.collection('tickets').doc(ticketId);

          const ticketData = {
            ticketId,
            orderId: order_id,
            eventId: orderData.eventId,
            userId: orderData.userId,
            qrCodeData: ticketId,
            isCheckedIn: false,
            checkedInAt: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ticketNumber: i + 1,
            totalTickets: orderData.quantity
          };

          transaction.set(ticketRef, ticketData);
        }
      });

      logger.info(`Payment processed successfully for order: ${order_id}`);

      // Generate tickets and send email
      await generateTicketsAndSendEmail(order_id, orderData);

    } else if (payment_status === 'FAILED' || order_status === 'CANCELLED') {
      // Update order status to failed
      await orderDoc.ref.update({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        failureReason: order.payment_message || 'Payment failed'
      });

      logger.info(`Payment failed for order: ${order_id}`);
    }

    res.status(200).send("Webhook processed successfully");

  } catch (error: any) {
    logger.error("Error processing webhook:", error);
    res.status(500).send("Internal server error");
  }
});

// Generate QR code as base64 data URL
async function generateQRCode(data: string): Promise<string> {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
}

// Send email using Brevo SMTP
async function sendEmailViaBrevo(to: string, subject: string, html: string) {
  try {
    const transporter = createBrevoTransporter();

    const mailOptions = {
      from: 'Festora <noreply@festora.foo>',
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via Brevo SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('Failed to send email via Brevo SMTP:', error);
    throw error;
  }
}

/**
 * Generate tickets and send email via Brevo SMTP (Updated)
 */
async function generateTicketsAndSendEmail(orderId: string, orderData: any) {
  try {
    // Get tickets for this order
    const ticketsSnapshot = await db.collection('tickets')
      .where('orderId', '==', orderId)
      .get();

    const tickets = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Get event details
    const eventDoc = await db.collection('events').doc(orderData.eventId).get();
    const eventData = eventDoc.data()!;

    // Get user details
    const userDoc = await db.collection('users').doc(orderData.userId).get();
    const userData = userDoc.data();

    if (!userData?.email) {
      logger.error('No user email found for order:', orderId);
      return;
    }

    // Generate QR codes and prepare ticket data
    const ticketEmailData = [];

    for (const ticket of tickets) {
      const ticketData = ticket as any;

      // Generate QR code as base64 data URL (embedded directly in email)
      const qrCodeBase64 = await generateQRCode(ticketData.qrCodeData);

      ticketEmailData.push({
        ...ticketData,
        qrCodeBase64: qrCodeBase64,
        eventData,
        userData
      });
    }

    // Send email using Brevo SMTP with embedded QR codes
    await sendTicketEmailViaBrevo(userData.email, ticketEmailData, eventData, orderData, orderId);

    logger.info(`Tickets generated and sent for order: ${orderId}`);

  } catch (error: any) {
    logger.error("Error generating tickets:", error);
  }
}

/**
 * Send beautiful ticket email using Brevo SMTP with embedded QR codes
 */
async function sendTicketEmailViaBrevo(userEmail: string, tickets: any[], eventData: any, orderData: any, orderId: string) {
  try {
    // Create ticket HTML for email with embedded QR codes
    const ticketHtml = tickets.map((ticket, index) => `
      <div style="border: 2px solid #e5e7eb; margin: 20px 0; padding: 24px; border-radius: 12px; background: #f9fafb;">
        <div style="text-align: center; margin-bottom: 16px;">
          <h3 style="color: #1f2937; margin: 0 0 8px 0; font-size: 18px;">🎫 Ticket #${ticket.ticketNumber}</h3>
          ${ticket.qrCodeBase64 ? `
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 16px auto; display: inline-block;">
              <img src="${ticket.qrCodeBase64}" alt="QR Code for ${ticket.ticketId}" 
                   style="width: 200px; height: 200px; display: block; margin: 0 auto;" />
            </div>
            <p style="color: #059669; font-weight: 600; margin: 8px 0;">Scan this QR code at the venue for entry</p>
          ` : ''}
        </div>
        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 4px 0;"><strong>Ticket ID:</strong> ${ticket.ticketId}</p>
          <p style="margin: 4px 0; font-family: monospace; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; display: inline-block;">
            ${ticket.ticketId}
          </p>
        </div>
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Festora Tickets</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-align: center; padding: 32px 24px;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🎉 Your Festora Tickets</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 16px;">Your tickets are ready!</p>
          </div>

          <!-- Event Details -->
          <div style="padding: 24px; border-bottom: 1px solid #e5e7eb;">
            <div style="background: #f8fafc; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
              <h2 style="color: #1e40af; margin: 0 0 16px 0; font-size: 24px;">${eventData.title}</h2>
              <div style="color: #4b5563; line-height: 1.6;">
                <p style="margin: 8px 0;">
                  <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">📅</span>
                  <strong>Date:</strong> ${new Date(eventData.dateTime.startDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p style="margin: 8px 0;">
                  <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">🕐</span>
                  <strong>Time:</strong> ${new Date(eventData.dateTime.startDate).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </p>
                <p style="margin: 8px 0;">
                  <span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">📍</span>
                  <strong>Venue:</strong> ${eventData.venue?.name || 'Online Event'}
                </p>
                ${orderData.totalAmount > 0 ? `
                  <p style="margin: 8px 0;">
                    <span style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">💰</span>
                    <strong>Total Paid:</strong> ₹${orderData.totalAmount}
                  </p>
                ` : `
                  <p style="margin: 8px 0;">
                    <span style="background: #dcfce7; color: #16a34a; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 8px;">🎁</span>
                    <strong>Registration:</strong> Free Event
                  </p>
                `}
              </div>
            </div>
          </div>

          <!-- Tickets Section -->
          <div style="padding: 24px;">
            <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; text-align: center;">
              Your Ticket${tickets.length > 1 ? 's' : ''} (${tickets.length})
            </h3>
            ${ticketHtml}
          </div>

          <!-- Instructions -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; margin: 0 24px 24px 24px; border-radius: 12px;">
            <h4 style="color: #1e40af; margin: 0 0 12px 0;">
              <span style="margin-right: 8px;">📋</span> Important Instructions
            </h4>
            <ul style="color: #1f2937; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li style="margin-bottom: 8px;">Save this email or screenshot your QR codes</li>
              <li style="margin-bottom: 8px;">Each QR code is unique and can only be used once</li>
              <li style="margin-bottom: 8px;">Arrive 15 minutes early for smooth check-in</li>
              <li style="margin-bottom: 8px;">Show your QR code at the entrance for scanning</li>
              <li>Contact support if you have any issues: festora@gmail.com</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; text-align: center; padding: 24px; color: #6b7280; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0; font-size: 16px; color: #1f2937;">Thank you for using Festora!</p>
            <p style="margin: 0; font-size: 14px;">We hope you enjoy the event. 🎊</p>
            <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px;">
                Order ID: ${orderData.orderId || orderId} | 
                Generated on ${new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email using Brevo SMTP
    const emailResult = await sendEmailViaBrevo(userEmail, `🎟️ Your tickets for ${eventData.title}`, emailHtml);

    logger.info(`Email sent via Brevo SMTP for order: ${orderId}`, emailResult);

  } catch (error: any) {
    logger.error("Error sending email via Brevo SMTP:", error);
  }
}

/**
 * Check-in ticket by scanning QR code (Enhanced with Firestore Transaction)
 */
export const checkInTicket = onCall({
  cors: true,
  enforceAppCheck: false
}, async (request) => {
  try {
    const { ticketId, eventId } = request.data;
    const userId = request.auth?.uid;

    if (!userId || !ticketId || !eventId) {
      throw new Error("Missing required parameters");
    }

    // Use Firestore Transaction for atomic check-in
    const result = await db.runTransaction(async (transaction) => {
      // Read the ticket document
      const ticketRef = db.collection('tickets').doc(ticketId);
      const ticketDoc = await transaction.get(ticketRef);

      if (!ticketDoc.exists) {
        throw new Error("Ticket not found");
      }

      const ticketData = ticketDoc.data()!;

      if (ticketData.eventId !== eventId) {
        throw new Error("Ticket does not belong to this event");
      }

      if (ticketData.isCheckedIn) {
        throw new Error("Ticket already used");
      }

      // Check in the ticket
      transaction.update(ticketRef, {
        isCheckedIn: true,
        checkedInAt: admin.firestore.FieldValue.serverTimestamp(),
        checkedInBy: userId
      });

      return {
        ticketId,
        eventId,
        userId: ticketData.userId,
        checkedInAt: new Date().toISOString()
      };
    });

    logger.info(`Ticket checked in: ${ticketId}`, { eventId, userId });

    return {
      success: true,
      message: "Check-in successful!",
      ticketData: result
    };

  } catch (error: any) {
    logger.error("Error checking in ticket:", error);
    throw new Error(`Check-in failed: ${error?.message || 'Unknown error'}`);
  }
});

/**
 * Get user's tickets
 */
export const getUserTickets = onCall({
  cors: true,
  enforceAppCheck: false
}, async (request) => {
  try {
    const userId = request.auth?.uid;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const ticketsSnapshot = await db.collection('tickets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const tickets = [];
    for (const doc of ticketsSnapshot.docs) {
      const ticketData = doc.data();

      // Get event details
      const eventDoc = await db.collection('events').doc(ticketData.eventId).get();
      const eventData = eventDoc.exists ? eventDoc.data() : null;

      tickets.push({
        id: doc.id,
        ...ticketData,
        eventData
      });
    }

    return { success: true, tickets };

  } catch (error: any) {
    logger.error("Error fetching user tickets:", error);
    throw new Error(`Failed to fetch tickets: ${error?.message || 'Unknown error'}`);
  }
});

/**
 * Get event ticket sales analytics (for event organizers/admins)
 */
export const getEventTicketAnalytics = onCall({
  cors: true,
  enforceAppCheck: false
}, async (request) => {
  try {
    const { eventId } = request.data;
    const userId = request.auth?.uid;

    if (!userId || !eventId) {
      throw new Error("Missing required parameters");
    }

    // Get event details
    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      throw new Error("Event not found");
    }

    const eventData = eventDoc.data()!;

    // Get orders for this event
    const ordersSnapshot = await db.collection('orders')
      .where('eventId', '==', eventId)
      .where('status', '==', 'completed')
      .get();

    const orders = ordersSnapshot.docs.map(doc => doc.data());

    // Get tickets for this event
    const ticketsSnapshot = await db.collection('tickets')
      .where('eventId', '==', eventId)
      .get();

    const tickets = ticketsSnapshot.docs.map(doc => doc.data());
    const checkedInTickets = tickets.filter(ticket => ticket.isCheckedIn);

    const analytics = {
      totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalOrders: orders.length,
      totalTicketsSold: eventData.ticketsSold || 0,
      totalTicketsAvailable: eventData.totalTickets || 0,
      totalCheckedIn: checkedInTickets.length,
      checkInRate: tickets.length > 0 ? (checkedInTickets.length / tickets.length) * 100 : 0,
      salesByDay: {}, // You can implement daily sales breakdown
      recentOrders: orders.slice(0, 10) // Last 10 orders
    };

    return { success: true, analytics };

  } catch (error: any) {
    logger.error("Error fetching event analytics:", error);
    throw new Error(`Failed to fetch analytics: ${error?.message || 'Unknown error'}`);
  }
});
