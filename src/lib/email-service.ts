/**
 * Festora Email Service
 * Centralized email dispatch with Firestore EmailLog persistence.
 * 
 * Two sending identities:
 *   Admin approval alerts  → admin@221blabs.com
 *   User-facing emails     → Festora <festora@221blabs.com>
 *
 * All emails are logged to the `email_logs` Firestore collection.
 */

import { sendEmailViaResend } from './resend-email';
import { db } from './firebase-admin';

// ─────────────────────────────────────────────
// Identities
// ─────────────────────────────────────────────
// Approval request emails FROM admin identity (internal comms)
const ADMIN_FROM = process.env.RESEND_FROM_EMAIL || 'Festora <festora@221blabs.com>';
// User-facing emails FROM Festora brand identity
const FESTORA_FROM = 'Festora <festora@221blabs.com>';
// Admin inbox that receives approval requests
const ADMIN_TO = process.env.ADMIN_EMAIL || 'admin@221blabs.com';

// ─────────────────────────────────────────────
// EmailLog – Firestore persistence
// ─────────────────────────────────────────────

export type EmailLogType =
  | 'event_approval_request'
  | 'event_approved'
  | 'event_rejected'
  | 'organizer_credentials'
  | 'participant_registration'
  | 'organizer_application_received'
  | 'enterprise_inquiry'
  | 'welcome'
  | 'ticket_confirmation';

export interface EmailLogEntry {
  type: EmailLogType;
  to: string | string[];
  from: string;
  subject: string;
  status: 'sent' | 'failed';
  resendId?: string;
  error?: string;
  metadata?: Record<string, unknown>;
  sentAt: string;
}

async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    if (!db) return;
    await db.collection('email_logs').add({
      ...entry,
      sentAt: entry.sentAt || new Date().toISOString(),
    });
  } catch (err) {
    // Never let logging crash the email flow
    console.error('[EmailLog] Failed to write log entry:', err);
  }
}

// ─────────────────────────────────────────────
// Flow A: Organiser submits event → notify admin
// ─────────────────────────────────────────────

export interface EventApprovalRequestParams {
  requestId: string;
  organizerName: string;
  organizerEmail: string;
  organizerPhone?: string;
  organizationName: string;
  username: string;
  eventTitle: string;
  eventId: string;
  startDate?: string;
  endDate?: string;
  venue?: string;
  price?: number;
  currency?: string;
  capacity?: number;
  category?: string;
  description?: string;
  adminReviewUrl?: string;
}

export async function sendEventApprovalRequestToAdmin(params: EventApprovalRequestParams): Promise<void> {
  const {
    requestId, organizerName, organizerEmail, organizerPhone,
    organizationName, username, eventTitle, eventId,
    startDate, endDate, venue, price, currency, capacity,
    category, description, adminReviewUrl
  } = params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
  const reviewUrl = adminReviewUrl || `${baseUrl}/admin`;

  const subject = `[Action Required] New Event Submission: "${eventTitle}" — Festora`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#07090e;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
    <div style="background-color:#0e121a;border:1px solid #1e2638;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="height:4px;background:linear-gradient(90deg,#d4af37,#f5d77a,#d4af37);"></div>
      <div style="padding:28px 32px 20px;border-bottom:1px solid #1c2230;text-align:center;">
        <span style="font-size:11px;color:#d4af37;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Festora Admin Panel</span>
        <h1 style="margin:10px 0 4px;font-size:22px;color:#ffffff;font-weight:700;">New Event Submission</h1>
        <p style="margin:0;font-size:13px;color:#64748b;">Request ID: <code style="color:#94a3b8;">${requestId}</code></p>
      </div>

      <!-- Organizer Info -->
      <div style="padding:24px 32px 0;">
        <h3 style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;border-bottom:1px solid #1c2230;padding-bottom:6px;">Organizer Details</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:150px;">Organization:</td><td style="padding:6px 0;color:#ffffff;font-size:14px;font-weight:600;">${organizationName}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Contact Name:</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;">${organizerName}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Email:</td><td style="padding:6px 0;font-size:14px;"><a href="mailto:${organizerEmail}" style="color:#d4af37;text-decoration:none;">${organizerEmail}</a></td></tr>
          ${organizerPhone ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Phone:</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;">${organizerPhone}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Handle:</td><td style="padding:6px 0;color:#94a3b8;font-size:13px;font-family:monospace;">@${username}</td></tr>
        </table>

        <h3 style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;border-bottom:1px solid #1c2230;padding-bottom:6px;">Event Details</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;width:150px;">Event Title:</td><td style="padding:6px 0;color:#ffffff;font-size:15px;font-weight:700;">${eventTitle}</td></tr>
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Event ID:</td><td style="padding:6px 0;color:#94a3b8;font-size:12px;font-family:monospace;">${eventId}</td></tr>
          ${startDate ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Start Date:</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;">${startDate}</td></tr>` : ''}
          ${endDate ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">End Date:</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;">${endDate}</td></tr>` : ''}
          ${venue ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Venue:</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;">${venue}</td></tr>` : ''}
          ${category ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Category:</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;">${category}</td></tr>` : ''}
          <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Price:</td><td style="padding:6px 0;color:${(price || 0) > 0 ? '#22c55e' : '#94a3b8'};font-size:14px;font-weight:600;">${(price || 0) > 0 ? `${currency || 'INR'} ${price}` : 'Free Event'}</td></tr>
          ${capacity ? `<tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Capacity:</td><td style="padding:6px 0;color:#e2e8f0;font-size:14px;">${capacity} attendees</td></tr>` : ''}
        </table>

        ${description ? `
        <h3 style="margin:0 0 10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;border-bottom:1px solid #1c2230;padding-bottom:6px;">Description</h3>
        <div style="background-color:#141a24;border:1px solid #1e2638;padding:16px;border-radius:4px;color:#cbd5e1;font-size:13.5px;line-height:1.7;margin-bottom:24px;white-space:pre-wrap;">${description}</div>
        ` : ''}

        <!-- CTA -->
        <div style="text-align:center;padding:16px 0 28px;">
          <a href="${reviewUrl}" style="display:inline-block;padding:14px 36px;background-color:#d4af37;color:#07090e;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;border-radius:4px;">
            Review in Admin Panel
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color:#07090e;padding:16px 32px;border-top:1px solid #1c2230;text-align:center;">
        <p style="margin:0;font-size:11px;color:#475569;letter-spacing:1px;">Festora Event Management System • 221B Labs</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const result = await sendEmailViaResend({
    to: ADMIN_TO,
    from: ADMIN_FROM,
    subject,
    html,
    reply_to: organizerEmail,
  });

  await logEmail({
    type: 'event_approval_request',
    to: ADMIN_TO,
    from: ADMIN_FROM,
    subject,
    status: result.success ? 'sent' : 'failed',
    resendId: result.id,
    error: result.error,
    metadata: { requestId, eventId, eventTitle, organizerEmail },
    sentAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────
// Flow B: Admin approves event → notify organiser
// ─────────────────────────────────────────────

export interface EventApprovedEmailParams {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  eventId: string;
  username?: string;
  password?: string;
  eventUrl?: string;
}

export async function sendEventApprovedEmail(params: EventApprovedEmailParams): Promise<void> {
  const { organizerEmail, organizerName, eventTitle, eventId, username, password, eventUrl } = params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
  const liveEventUrl = eventUrl || `${baseUrl}/events/${eventId}`;
  const organizerDashUrl = `${baseUrl}/organizer`;

  const subject = `🎉 Approved! "${eventTitle}" is now Live on Festora`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0d0f12;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 16px;">
    <div style="background-color:#16191f;border:1px solid #2b303a;border-radius:12px;overflow:hidden;">
      <div style="height:3px;background:linear-gradient(90deg,#22c55e,#4ade80,#22c55e);"></div>
      <div style="padding:32px 32px 24px;border-bottom:1px solid #2b303a;text-align:center;">
        <div style="width:56px;height:56px;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
          <span style="font-size:24px;">✅</span>
        </div>
        <h1 style="margin:8px 0 4px;font-size:22px;color:#ffffff;font-weight:700;">Event Approved!</h1>
        <p style="margin:0;font-size:13px;color:#6b7280;">Your event is now live and accepting registrations</p>
      </div>

      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#e5e7eb;line-height:1.6;margin:0 0 20px;">
          Hello <strong>${organizerName}</strong>,
        </p>
        <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:0 0 24px;">
          Great news! Your event <strong style="color:#ffffff;">"${eventTitle}"</strong> has been reviewed and approved by the Festora administration team. It is now publicly visible and open for registrations.
        </p>

        <!-- Event Status Card -->
        <div style="background-color:#0d0f12;border:1px solid #22c55e;border-radius:8px;padding:20px;margin:0 0 28px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#22c55e;font-weight:700;">● LIVE</span>
          </div>
          <p style="margin:0;font-size:16px;font-weight:700;color:#ffffff;">${eventTitle}</p>
          <p style="margin:6px 0 0;font-size:12px;color:#6b7280;font-family:monospace;">${eventId}</p>
        </div>

        ${(username && password) ? `
        <!-- Credentials -->
        <div style="background-color:#0d0f12;border:1px solid #d4af37;border-radius:8px;padding:20px;margin:0 0 28px;">
          <h3 style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;">Your Login Credentials</h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;width:120px;">Username:</td><td style="padding:6px 0;color:#ffffff;font-size:15px;font-family:monospace;font-weight:700;">${username}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280;font-size:13px;">Password:</td><td style="padding:6px 0;color:#d4af37;font-size:15px;font-family:monospace;font-weight:700;">${password}</td></tr>
          </table>
        </div>
        ` : ''}

        <!-- CTAs -->
        <div style="text-align:center;margin:0 0 8px;">
          <a href="${liveEventUrl}" style="display:inline-block;padding:13px 28px;background-color:#22c55e;color:#0d0f12;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;border-radius:6px;margin:0 8px 12px;">
            View Live Event
          </a>
          <a href="${organizerDashUrl}" style="display:inline-block;padding:13px 28px;background-color:#1c212a;color:#d4af37;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:1.5px;text-transform:uppercase;border-radius:6px;border:1px solid #d4af37;margin:0 8px 12px;">
            Organizer Dashboard
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color:#07090e;padding:16px 32px;border-top:1px solid #1c2230;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#d4af37;font-weight:600;letter-spacing:1px;">Festora • 221B Labs</p>
        <p style="margin:0;font-size:11px;color:#475569;">Questions? Reply to this email or contact festora@221blabs.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const result = await sendEmailViaResend({
    to: organizerEmail,
    from: FESTORA_FROM,
    subject,
    html,
  });

  await logEmail({
    type: 'event_approved',
    to: organizerEmail,
    from: FESTORA_FROM,
    subject,
    status: result.success ? 'sent' : 'failed',
    resendId: result.id,
    error: result.error,
    metadata: { eventId, eventTitle },
    sentAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────
// Flow C: Admin rejects event → notify organiser
// ─────────────────────────────────────────────

export interface EventRejectedEmailParams {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  eventId: string;
  rejectionReason?: string;
}

export async function sendEventRejectedEmail(params: EventRejectedEmailParams): Promise<void> {
  const { organizerEmail, organizerName, eventTitle, rejectionReason } = params;

  const subject = `Update on Your Event Submission: "${eventTitle}" — Festora`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background-color:#0d0f12;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 16px;">
    <div style="background-color:#16191f;border:1px solid #2b303a;border-radius:12px;overflow:hidden;">
      <div style="height:3px;background:linear-gradient(90deg,#ef4444,#f87171,#ef4444);"></div>
      <div style="padding:32px 32px 24px;border-bottom:1px solid #2b303a;text-align:center;">
        <h1 style="margin:8px 0 4px;font-size:22px;color:#ffffff;font-weight:700;">Event Review Update</h1>
        <p style="margin:0;font-size:13px;color:#6b7280;">Regarding your submission to Festora</p>
      </div>

      <div style="padding:28px 32px;">
        <p style="font-size:15px;color:#e5e7eb;line-height:1.6;margin:0 0 16px;">Hello <strong>${organizerName}</strong>,</p>
        <p style="font-size:14px;color:#9ca3af;line-height:1.6;margin:0 0 24px;">
          Thank you for submitting <strong style="color:#ffffff;">"${eventTitle}"</strong> to Festora. After careful review, our administration team was unable to approve this submission at this time.
        </p>

        ${rejectionReason ? `
        <div style="background-color:#0d0f12;border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:20px;margin:0 0 24px;">
          <h4 style="margin:0 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#f87171;">Review Feedback</h4>
          <p style="margin:0;font-size:14px;color:#e5e7eb;line-height:1.7;white-space:pre-wrap;">${rejectionReason}</p>
        </div>
        ` : ''}

        <div style="background-color:#1c212a;border-radius:8px;padding:20px;margin:0 0 24px;border-left:3px solid #3b82f6;">
          <h4 style="margin:0 0 8px;font-size:13px;color:#ffffff;">What can you do?</h4>
          <ul style="margin:0;padding-left:18px;color:#94a3b8;font-size:13px;line-height:1.8;">
            <li>Address the feedback above and resubmit your event</li>
            <li>Contact our team for clarification on the review decision</li>
            <li>Email us at <a href="mailto:festora@221blabs.com" style="color:#d4af37;text-decoration:none;">festora@221blabs.com</a> with questions</li>
          </ul>
        </div>

        <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
          We appreciate your interest in using Festora as your event platform and encourage you to resubmit once any issues are resolved.
        </p>
      </div>

      <div style="background-color:#07090e;padding:16px 32px;border-top:1px solid #1c2230;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#d4af37;font-weight:600;letter-spacing:1px;">Festora • 221B Labs</p>
        <p style="margin:0;font-size:11px;color:#475569;">festora@221blabs.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const result = await sendEmailViaResend({
    to: organizerEmail,
    from: FESTORA_FROM,
    subject,
    html,
  });

  await logEmail({
    type: 'event_rejected',
    to: organizerEmail,
    from: FESTORA_FROM,
    subject,
    status: result.success ? 'sent' : 'failed',
    resendId: result.id,
    error: result.error,
    metadata: { eventTitle, rejectionReason },
    sentAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────
// Flow D: Participant registers → confirm ticket
// (already handled by order-processing.ts + resend-email.ts)
// This wrapper adds EmailLog persistence.
// ─────────────────────────────────────────────

export interface ParticipantRegistrationEmailParams {
  participantEmail: string;
  participantName: string;
  eventTitle: string;
  eventId: string;
  ticketCode: string;
  orderId: string;
}

export async function logParticipantRegistrationEmail(params: ParticipantRegistrationEmailParams, result: { success: boolean; id?: string; error?: string }): Promise<void> {
  const subject = `Registration Confirmed: ${params.eventTitle}`;
  await logEmail({
    type: 'participant_registration',
    to: params.participantEmail,
    from: FESTORA_FROM,
    subject,
    status: result.success ? 'sent' : 'failed',
    resendId: result.id,
    error: result.error,
    metadata: {
      eventId: params.eventId,
      eventTitle: params.eventTitle,
      ticketCode: params.ticketCode,
      orderId: params.orderId,
    },
    sentAt: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────
// Re-export logEmail for other modules
// ─────────────────────────────────────────────
export { logEmail };