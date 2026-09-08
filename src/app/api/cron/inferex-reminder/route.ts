import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Types for Firestore ticket/event documents
interface TicketDocument {
  id: string;
  memberEmail?: string;
  memberName?: string;
  email?: string;
  name?: string;
  ticketId?: string;
  qrCodeData?: string;
  orderId?: string;
  orderNumber?: string;
  ticketNumber?: number;
  totalTickets?: number;
  teamName?: string;
  teamInfo?: {
    teamName?: string;
    memberName?: string;
    memberEmail?: string;
  };
  customerDetails?: {
    email?: string;
    name?: string;
  };
  status?: string;
}

interface EventDocument {
  id: string;
  title: string;
  venue?: { name?: string } | string;
  dateTime?: { startDate?: string };
  currency?: string;
  [key: string]: unknown;
}

// Initialize Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.BREVO_API_KEY,
  },
});

// Generate QR code as buffer
async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  return await QRCode.toBuffer(data, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    width: 300,
  });
}

// Generate reminder email HTML
function generateReminderEmailHTML(data: {
  customerName: string;
  eventTitle: string;
  orderNumber: string;
  eventDate: string;
  eventVenue: string;
  ticketCode: string;
  teamName?: string;
  memberNumber?: number;
  totalMembers?: number;
}) {
  const formattedDate = new Date(data.eventDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const teamInfo = data.teamName && data.teamName !== 'Individual'
    ? `<p style="color: #6b7280; margin-top: 8px;">Team: <strong>${data.teamName}</strong>${data.memberNumber ? ` • Member ${data.memberNumber} of ${data.totalMembers}` : ''}</p>`
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Reminder - Festora</title>
    </head>
    <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <div style="text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #f3f4f6;">
          <div style="font-size: 32px; font-weight: bold; color: #4f46e5; margin-bottom: 8px;">Festora</div>
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; padding: 10px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; display: inline-block; margin-bottom: 16px;">
            ⏰ EVENT REMINDER
          </div>
          <h2 style="margin: 0; color: #1f2937; font-size: 24px;">The event is TODAY! 🎉</h2>
          ${teamInfo}
        </div>

        <p style="margin-bottom: 16px; font-size: 16px;">Hi <strong>${data.customerName}</strong>,</p>
        <p style="margin-bottom: 24px; font-size: 16px;">This is a friendly reminder that <strong>${data.eventTitle}</strong> is happening today! Make sure you have your ticket ready.</p>

        <div style="background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; font-size: 18px; font-weight: bold;">🚀 Don't miss out!</p>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Keep this email handy for quick entry</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 16px;">📅 Event Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 10px 0; color: #6b7280; width: 100px;">Event:</td><td style="padding: 10px 0; font-weight: 600; color: #1f2937;">${data.eventTitle}</td></tr>
            <tr><td style="padding: 10px 0; color: #6b7280;">Date:</td><td style="padding: 10px 0; font-weight: 600; color: #1f2937;">${formattedDate}</td></tr>
            <tr><td style="padding: 10px 0; color: #6b7280;">Venue:</td><td style="padding: 10px 0; font-weight: 600; color: #1f2937;">${data.eventVenue}</td></tr>
            <tr><td style="padding: 10px 0; color: #6b7280;">Order ID:</td><td style="padding: 10px 0; font-family: monospace; font-size: 12px; color: #6b7280;">${data.orderNumber}</td></tr>
          </table>
        </div>

        <div style="text-align: center; margin-bottom: 24px; padding: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
          <h3 style="color: white; margin: 0 0 16px 0; font-size: 20px;">🎫 Your Entry Ticket</h3>
          <div style="background: white; padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
            <img src='cid:qrcode' alt="Ticket QR Code" style="width: 200px; height: 200px; display: block;" />
          </div>
          <p style="color: white; font-size: 12px; margin: 0; opacity: 0.9;">Ticket ID: <span style="font-family: monospace; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px;">${data.ticketCode}</span></p>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #6ee7b7; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
          <h4 style="color: #047857; margin: 0 0 12px 0;">✅ Quick Checklist</h4>
          <ul style="color: #065f46; margin: 0; padding-left: 20px; line-height: 2;">
            <li>Screenshot this QR code ✓</li>
            <li>Arrive 15 minutes early ✓</li>
            <li>Bring a valid ID (if required) ✓</li>
            <li>Check the venue location ✓</li>
          </ul>
        </div>

        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; margin-bottom: 24px;">
          <p style="color: white; margin: 0; font-size: 20px; font-weight: bold;">See you there! 🎊</p>
        </div>

        <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p style="margin-bottom: 8px;">Questions? Contact us at <a href="mailto:festora@gmail.com" style="color: #4f46e5;">festora@gmail.com</a></p>
          <p style="margin: 0;">Made with ❤️ by MLSC</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send reminder email
async function sendReminderEmail(
  ticketData: TicketDocument,
  eventData: EventDocument
): Promise<{ success: boolean; email?: string; error?: string }> {
  const email = ticketData.memberEmail || ticketData.customerDetails?.email || ticketData.email;

  if (!email) {
    return { success: false, error: 'No email address found' };
  }

  try {
    const ticketCode = ticketData.ticketId || ticketData.qrCodeData || ticketData.id;
    const qrCodeBuffer = await generateQRCodeBuffer(ticketCode);

    const html = generateReminderEmailHTML({
      customerName: ticketData.memberName || ticketData.customerDetails?.name || ticketData.name || 'Participant',
      eventTitle: eventData.title,
      orderNumber: ticketData.orderId || ticketData.orderNumber || 'N/A',
      eventDate: eventData.dateTime?.startDate || new Date().toISOString(),
      eventVenue: typeof eventData.venue === 'string' ? eventData.venue : eventData.venue?.name || 'Event Venue',
      ticketCode: ticketCode,
      teamName: ticketData.teamInfo?.teamName || ticketData.teamName || 'Individual',
      memberNumber: ticketData.ticketNumber,
      totalMembers: ticketData.totalTickets,
    });

    const mailOptions = {
      from: 'Festora <noreply@festora.foo>',
      to: email,
      subject: `⏰ REMINDER: ${eventData.title} is TODAY! - Don't forget your ticket 🎫`,
      html: html,
      attachments: [
        {
          filename: `ticket-${ticketCode}.png`,
          content: qrCodeBuffer,
          contentType: 'image/png',
          cid: 'qrcode',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    return { success: true, email };
  } catch (error: unknown) {
    return { success: false, email, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Background email sending function (stores progress in Firestore)
async function sendEmailsInBackground(participants: TicketDocument[], eventData: EventDocument, jobId: string) {
  const jobRef = db.collection('emailJobs').doc(jobId);

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const result = await sendReminderEmail(participant, eventData);

    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push(`${result.email}: ${result.error}`);
    }

    // Update progress every 10 emails
    if (i % 10 === 0 || i === participants.length - 1) {
      await jobRef.update({
        sent,
        failed,
        progress: Math.round(((i + 1) / participants.length) * 100),
        lastUpdated: new Date().toISOString(),
      });
    }

    // Small delay between emails
    if (i < participants.length - 1) {
      await sleep(500);
    }
  }

  // Mark job as complete
  await jobRef.update({
    status: 'completed',
    sent,
    failed,
    errors: errors.slice(0, 20), // Keep first 20 errors
    completedAt: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const querySecret = searchParams.get('secret');
  const testMode = searchParams.get('test') === 'true';
  const checkStatus = searchParams.get('status'); // Job ID to check status
  const cronSecret = process.env.CRON_SECRET || 'festora-cron-secret-2026-inferex';

  const isAuthorized = authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check job status if requested
  if (checkStatus) {
    try {
      const jobDoc = await db.collection('emailJobs').doc(checkStatus).get();
      if (!jobDoc.exists) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, job: jobDoc.data() });
    } catch (error: unknown) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
  }

  const EVENT_ID = 'inferex';

  try {
    // 1. Fetch event
    let eventDoc = await db.collection('events').doc(EVENT_ID).get();

    if (!eventDoc.exists) {
      const eventsQuery = await db.collection('events').where('slug', '==', EVENT_ID).limit(1).get();
      if (!eventsQuery.empty) {
        eventDoc = eventsQuery.docs[0];
      }
    }

    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const eventData = { id: eventDoc.id, ...eventDoc.data() } as any;

    // 2. Fetch all participants
    const allParticipants: any[] = [];

    const ticketsSnapshot = await db.collection('tickets').where('eventId', '==', eventDoc.id).get();
    ticketsSnapshot.docs.forEach((doc) => {
      allParticipants.push({ id: doc.id, ...doc.data() });
    });

    const registrationsSnapshot = await db.collection('registrations').where('eventId', '==', eventDoc.id).get();
    registrationsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!allParticipants.find((p) => p.memberEmail === data.memberEmail)) {
        allParticipants.push({ id: doc.id, ...data });
      }
    });

    const eventRegistrations = await db.collection('events').doc(eventDoc.id).collection('registrations').get();
    eventRegistrations.docs.forEach((doc) => {
      const data = doc.data();
      if (!allParticipants.find((p) => p.memberEmail === data.memberEmail || p.email === data.email)) {
        allParticipants.push({ id: doc.id, ...data });
      }
    });

    const validParticipants = allParticipants.filter((p) => {
      const email = p.memberEmail || p.customerDetails?.email || p.email;
      const status = p.status?.toLowerCase();
      return email && (!status || status === 'confirmed' || status === 'completed' || status === 'paid');
    });

    // TEST MODE: Send only to last participant
    if (testMode) {
      if (validParticipants.length === 0) {
        return NextResponse.json({
          success: false,
          testMode: true,
          message: 'No participants found',
        });
      }

      const lastParticipant = validParticipants[validParticipants.length - 1];
      const testEmail = lastParticipant.memberEmail || lastParticipant.customerDetails?.email || lastParticipant.email;
      const testName = lastParticipant.memberName || lastParticipant.customerDetails?.name || lastParticipant.name || 'Test User';

      const result = await sendReminderEmail(lastParticipant, eventData);

      return NextResponse.json({
        success: result.success,
        testMode: true,
        message: result.success
          ? `✅ TEST: Email sent to ${testName} (${testEmail})`
          : `❌ TEST: Failed - ${result.error}`,
        event: eventData.title,
        totalParticipants: validParticipants.length,
        testRecipient: { email: testEmail, name: testName },
        note: 'Remove ?test=true to send to ALL participants.',
      });
    }

    // PRODUCTION MODE: Create job and start background processing
    const jobId = `inferex-reminder-${Date.now()}`;

    // Create job document
    await db.collection('emailJobs').doc(jobId).set({
      status: 'processing',
      event: eventData.title,
      eventId: eventDoc.id,
      totalParticipants: validParticipants.length,
      sent: 0,
      failed: 0,
      progress: 0,
      startedAt: new Date().toISOString(),
      errors: [],
    });

    // Start background processing (don't await - let it run in background)
    sendEmailsInBackground(validParticipants, eventData, jobId).catch((err) => {
      console.error('Background email job failed:', err);
      db.collection('emailJobs').doc(jobId).update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    });

    return NextResponse.json({
      success: true,
      message: `🚀 Started sending ${validParticipants.length} reminder emails for ${eventData.title}`,
      jobId: jobId,
      totalParticipants: validParticipants.length,
      checkStatusUrl: `/api/cron/inferex-reminder?secret=${cronSecret}&status=${jobId}`,
      note: 'Emails are being sent in the background. Use checkStatusUrl to monitor progress.',
    });

  } catch (error: unknown) {
    console.error('Cron job error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
