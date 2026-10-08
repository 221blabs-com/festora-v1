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
import {
  buildAdminNewEventNotificationHtml,
  buildOrganizerCredentialsHtml,
} from './email-templates-festora';

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
// ─────────────�export async function sendEventApprovalRequestToAdmin(params: EventApprovalRequestParams): Promise<void> {
  const {
    requestId, organizerName, organizerEmail, organizerPhone,
    organizationName, username, eventTitle, eventId,
    startDate, endDate, venue, price, currency, capacity,
    category, description, adminReviewUrl
  } = params;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5000';
  const reviewUrl = adminReviewUrl || `${baseUrl}/admin`;

  const subject = `[Action Required] New Event Submission: "${eventTitle}" — Festora`;

  const html = buildAdminNewEventNotificationHtml({
    adminEmail: ADMIN_TO,
    organizer: {
      organizationName,
      contactName: organizerName,
      email: organizerEmail,
      phone: organizerPhone,
      username,
    },
    event: {
      id: eventId,
      title: eventTitle,
      startDate,
      endDate,
      venue,
      price,
      currency,
      capacity,
      category,
      description,
    },
    requestId,
    adminReviewUrl: reviewUrl,
  });

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
  const { organizerEmail, organizerName, eventTitle, eventId, username, password } = params;

  const subject = `🎉 Approved! "${eventTitle}" is now Live on Festora`;

  const html = buildOrganizerCredentialsHtml({
    organizerName,
    username: username || '',
    password,
    eventTitle,
    eventId,
    status: 'approved',
  });

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
  const { organizerEmail, organizerName, eventTitle, eventId, rejectionReason } = params;

  const subject = `Update on Your Event Submission: "${eventTitle}" — Festora`;

  const html = buildOrganizerCredentialsHtml({
    organizerName,
    username: '',
    eventTitle,
    eventId,
    status: 'rejected',
    rejectionReason,
  });

  const result = await sendEmailViaResend({
    to: organizerEmail,
    from: FESTORA_FROM,
    subject,
    html,
  });
i>Email us at <a href="mailto:festora@221blabs.com" style="color:#d4af37;text-decoration:none;">festora@221blabs.com</a> with questions</li>
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