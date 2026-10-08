import https from 'https';
import QRCode from 'qrcode';
import {
  buildParticipantTicketEmailHtml,
  buildTeamRegistrationEmailHtml,
  buildAdminNewEventNotificationHtml,
  buildOrganizerCredentialsHtml,
  buildEnterpriseInquiryEmailHtml,
  buildEventUpdateEmailHtml,
  buildEventCancellationEmailHtml,
  buildPaymentReceiptEmailHtml,
  buildDynamicQrEmailHtml,
} from './email-templates-festora';

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded string
  content_type?: string;
  content_id?: string; // Set to reference this attachment inline via <img src="cid:...">
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  reply_to?: string | string[];
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  data?: any;
}

/**
 * Send an email using Resend REST API via Node https module
 */
function recordEmailLog(entry: {
  to: string | string[];
  from: string;
  subject: string;
  status: 'sent' | 'failed';
  resendId?: string;
  error?: string;
}) {
  try {
    import('./firebase-admin').then(({ db }) => {
      if (db && typeof db.collection === 'function') {
        db.collection('email_logs').add({
          ...entry,
          sentAt: new Date().toISOString(),
        }).catch(() => {});
      }
    }).catch(() => {});
  } catch {
    // Non-blocking background log
  }
}
export async function sendEmailViaResend({
  to,
  subject,
  html,
  text,
  from,
  reply_to,
  attachments,
}: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const sender = from || process.env.RESEND_FROM_EMAIL || 'Festora <festora@221blabs.com>';

  if (!apiKey) {
    console.error('[Resend] Missing RESEND_API_KEY - set it in the deployment environment. Falling back to SMTP if configured.');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const recipients = Array.isArray(to) ? to : [to];

  const payloadData: Record<string, unknown> = {
    from: sender,
    to: recipients,
    subject,
    html,
    text: text || html.replace(/<[^>]*>?/gm, ''),
  };

  if (reply_to) {
    payloadData.reply_to = reply_to;
  }

  if (attachments && attachments.length > 0) {
    payloadData.attachments = attachments;
  }

  const payload = JSON.stringify(payloadData);

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.resend.com',
        port: 443,
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              console.log('[Resend] Email sent successfully:', data.id);
              recordEmailLog({ to: recipients, from: sender, subject, status: 'sent', resendId: data.id });
              resolve({ success: true, id: data.id, data: { messageId: data.id, ...data } });
            } else {
              console.error('[Resend] API Error:', res.statusCode, data);
              recordEmailLog({ to: recipients, from: sender, subject, status: 'failed', error: data.message || ('HTTP ' + res.statusCode)  });
              resolve({ success: false, error: data.message || `HTTP ${res.statusCode}` });
            }
          } catch (e) {
            console.error('[Resend] JSON parse error:', e, body);
            resolve({ success: false, error: 'Invalid response from Resend' });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('[Resend] Network error:', err.message);
      recordEmailLog({ to: recipients, from: sender, subject, status: 'failed', error: err.message });
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

export interface OrganizerCredentialsEmailParams {
  to: string;
  organizerName: string;
  username: string;
  password?: string;
  eventTitle: string;
  eventId?: string;
  status?: 'created' | 'approved' | 'submitted' | 'rejected';
  rejectionReason?: string;
}

/**
 * Send an email to the organizer confirming the status of their event application
 * (Approval with credentials, Rejection with feedback, or Submission acknowledgment)
 */
export async function sendOrganizerCredentialsEmail({
  to,
  organizerName,
  username,
  password,
  eventTitle,
  eventId,
  status = 'approved',
  rejectionReason,
}: OrganizerCredentialsEmailParams): Promise<SendEmailResult> {
  const isApproved = status === 'approved';
  const isCreated = status === 'created';
  const isRejected = status === 'rejected';

  const subject = isApproved
    ? `🎉 Your Festora Organizer Account & Event "${eventTitle}" Are Live!`
    : isCreated
    ? `🎟️ Organizer Credentials for "${eventTitle}" - Festora`
    : isRejected
    ? `Update Regarding Your Event Request: "${eventTitle}" - Festora`
    : `📋 Application Received for "${eventTitle}" - Festora`;

  const html = buildOrganizerCredentialsHtml({
    organizerName,
    username,
    password,
    eventTitle,
    eventId,
    status,
    rejectionReason,
  });

  // 1. Send via Resend directly
  const resendResult = await sendEmailViaResend({
    to,
    subject,
    html,
  });

  if (resendResult.success) {
    return resendResult;
  }
  console.warn('[Email] Resend send warning for organizer notification, trying SMTP fallback:', resendResult.error);

  // 2. Fallback to SMTP if Resend fails
  try {
    const { hasSmtpConfig, sendEmailViaSMTP } = await import('./email');
    if (hasSmtpConfig()) {
      const smtpRes = await sendEmailViaSMTP({
        to,
        subject,
        html,
        senderName: 'Festora',
      });
      if (smtpRes.success) {
        return { success: true, id: (smtpRes.data as any)?.messageId, data: smtpRes.data };
      }
    }
  } catch (smtpErr) {
    console.warn('[Email] SMTP fallback error for organizer notification:', smtpErr);
  }

  return resendResult;
}


export interface AdminNewEventNotificationParams {
  adminEmail?: string;
  organizer: {
    organizationName: string;
    contactName: string;
    email: string;
    phone?: string;
    username: string;
    eventTypes?: string;
  };
  event: {
    title: string;
    startDate?: string;
    endDate?: string;
    venue?: string;
    venueType?: string;
    price?: number;
    currency?: string;
    capacity?: number;
    category?: string;
    description?: string;
    id?: string;
  };
  requestId?: string;
}

/**
 * Send an email notification to the Admin with full contact & event details
 * when an organizer registers and submits an event for acceptance.
 */
export async function sendAdminNewEventNotificationEmail({
  adminEmail,
  organizer,
  event,
  requestId,
}: AdminNewEventNotificationParams): Promise<SendEmailResult> {
  const to = adminEmail || process.env.ADMIN_EMAIL || process.env.SYSTEM_ADMIN_EMAIL || 'festora@221blabs.com';
  const subject = `🔔 New Event Request: "${event.title}" by ${organizer.organizationName || organizer.contactName}`;

  const html = buildAdminNewEventNotificationHtml({
    adminEmail: to,
    organizer,
    event,
    requestId,
  });


  // 1. Send via Resend directly
  const resendResult = await sendEmailViaResend({
    to,
    subject,
    html,
  });

  if (resendResult.success) {
    return resendResult;
  }
  console.warn('[Email] Resend send warning for admin notification, trying SMTP fallback:', resendResult.error);

  // 2. Fallback to SMTP if Resend fails
  try {
    const { hasSmtpConfig, sendEmailViaSMTP } = await import('./email');
    if (hasSmtpConfig()) {
      const smtpRes = await sendEmailViaSMTP({
        to,
        subject,
        html,
        senderName: 'Festora Alerts',
      });
      if (smtpRes.success) {
        return { success: true, id: (smtpRes.data as any)?.messageId, data: smtpRes.data };
      }
    }
  } catch (smtpErr) {
    console.warn('[Email] SMTP error for admin notification:', smtpErr);
  }

  return resendResult;
}

export interface TicketConfirmationEmailParams {
  customerEmail: string;
  customerName: string;
  eventTitle: string;
  orderNumber: string;
  ticketPrice: number;
  currency: string;
  eventDate: string;
  eventTime?: string;
  eventEndDate?: string;
  eventVenue: string;
  ticketCode: string;
  teamName?: string;
  memberNumber?: number;
  totalMembers?: number;
  isIndividualTicket?: boolean;
  organizerName?: string;
  organizerEmail?: string;
  organizerPhone?: string;
  platformFee?: number;
  totalAmount?: number;
  participantDetails?: {
    phone?: string;
    rollNumber?: string;
    year?: string;
    college?: string;
    department?: string;
    gender?: string;
    tshirtSize?: string;
    customAnswers?: Record<string, string>;
  };
  dayTickets?: Array<{
    dayNumber: number;
    dayDate: string;
    passCode: string;
  }>;
}

/**
 * Send ticket confirmation email to attendee with complete event & ticket details,
 * organizer details, participant registration details, and QR code for venue verification.
 */
export async function sendTicketConfirmationEmailViaResend({
  customerEmail,
  customerName,
  eventTitle,
  orderNumber,
  ticketPrice,
  currency,
  eventDate,
  eventTime,
  eventEndDate,
  eventVenue,
  ticketCode,
  teamName,
  memberNumber,
  totalMembers,
  isIndividualTicket = true,
  organizerName,
  organizerEmail,
  organizerPhone,
  platformFee,
  totalAmount,
  participantDetails,
  dayTickets,
}: TicketConfirmationEmailParams): Promise<SendEmailResult> {
  const cleanEvent = (eventTitle || '').replace(/[<>"']/g, '').trim();
  const senderDisplayName = cleanEvent ? `Festora - ${cleanEvent}` : 'Festora';
  const from = `"${senderDisplayName}" <festora@221blabs.com>`;
  const subject = `🎫 Entry Ticket: "${cleanEvent || 'Event'}" - Festora`;

  // Generate QR Code PNG buffer
  let qrBase64 = '';
  try {
    const qrBuffer = await QRCode.toBuffer(ticketCode, {
      type: 'png',
      margin: 1,
      width: 320,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
    qrBase64 = qrBuffer.toString('base64');
  } catch (qrErr) {
    console.warn('[Resend] QR buffer generation warning:', qrErr);
  }

  // Format event schedule cleanly
  let formattedSchedule = eventDate || 'Date to be announced';
  if (eventEndDate && eventEndDate !== eventDate) {
    formattedSchedule = `${eventDate} - ${eventEndDate}`;
  }
  if (eventTime) {
    formattedSchedule = `${formattedSchedule} • ${eventTime}`;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://festora.221blabs.com';
  const ticketsUrl = `${baseUrl}/dashboard/tickets`;

  const html = buildParticipantTicketEmailHtml({
    customerName,
    customerEmail,
    eventTitle: cleanEvent,
    orderNumber,
    ticketPrice,
    currency: currency || 'INR',
    eventDate,
    eventTime,
    eventEndDate,
    eventVenue,
    ticketCode,
    quantity: 1,
    platformFee,
    totalAmount,
    organizerName,
    organizerEmail,
    organizerPhone,
    viewTicketUrl: ticketsUrl,
    participantDetails,
    dayTickets,
  });


  // Include QR code image as an attachment if generated
  const attachments: EmailAttachment[] = [];
  if (qrBase64) {
    attachments.push({
      filename: `Festora-Ticket-${ticketCode}.png`,
      content: qrBase64,
      content_type: 'image/png',
    });
  }

  // 1. Send via Resend directly
  const resendResult = await sendEmailViaResend({
    to: customerEmail,
    subject,
    html,
    from,
    attachments,
  });

  if (resendResult.success) {
    return resendResult;
  }
  console.warn('[Email] Resend send warning for ticket, trying SMTP fallback:', resendResult.error);

  // 2. Fallback to SMTP if Resend fails
  try {
    const { hasSmtpConfig, sendEmailViaSMTP } = await import('./email');
    if (hasSmtpConfig()) {
      const smtpRes = await sendEmailViaSMTP({
        to: customerEmail,
        subject,
        html,
        senderName: cleanEvent ? `Festora - ${cleanEvent}` : 'Festora',
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.content_type,
        })),
      });
      if (smtpRes.success) {
        return { success: true, id: (smtpRes.data as any)?.messageId, data: smtpRes.data };
      }
    }
  } catch (smtpErr) {
    console.warn('[Email] SMTP error for tickets:', smtpErr);
  }

  return resendResult;
}

export interface EnterpriseInquiryEmailParams {
  inquiryId: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  role?: string;
  attendees?: string;
  eventType?: string;
  timeline?: string;
  message?: string;
  submittedAt?: string;
}

/**
 * Send enterprise inquiry notification to admin (festora@221blabs.com)
 * and an automatic confirmation receipt to the requester.
 */
export async function sendEnterpriseInquiryEmail(params: EnterpriseInquiryEmailParams): Promise<{
  adminResult: SendEmailResult;
  customerResult: SendEmailResult;
}> {
  const {
    inquiryId,
    name,
    email,
    phone,
    organization,
    role = 'Not Specified',
    attendees = 'Custom / Enterprise Scale',
    eventType = 'General Enterprise Event',
    timeline = 'Flexible / Upcoming',
    message = 'No specific notes provided.',
    submittedAt = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    }),
  } = params;

  // 1. Admin Email (sent to festora@221blabs.com with reply_to set to customer email)
  const adminSubject = `[Festora Enterprise Inquiry #${inquiryId}] ${organization} — ${name}`;
  const adminHtml = buildEnterpriseInquiryEmailHtml({
    inquiryId,
    name,
    email,
    phone,
    organization,
    role,
    attendees,
    eventType,
    timeline,
    message,
    submittedAt,
    isCustomerConfirmation: false,
  });

  // 2. Requester Receipt Confirmation Email
  const customerSubject = `We've Received Your Enterprise Request — Festora`;
  const customerHtml = buildEnterpriseInquiryEmailHtml({
    inquiryId,
    name,
    email,
    phone,
    organization,
    role,
    attendees,
    eventType,
    timeline,
    message,
    submittedAt,
    isCustomerConfirmation: true,
  });


  // Send admin notification
  const adminResult = await sendEmailViaResend({
    to: 'festora@221blabs.com',
    from: 'Festora Enterprise <festora@221blabs.com>',
    reply_to: `${name} <${email}>`,
    subject: adminSubject,
    html: adminHtml,
  });

  // Send requester confirmation
  const customerResult = await sendEmailViaResend({
    to: email,
    from: 'Festora Enterprise <festora@221blabs.com>',
    reply_to: 'festora@221blabs.com',
    subject: customerSubject,
    html: customerHtml,
  });

  return { adminResult, customerResult };
}

/**
 * Send an event update email to attendee
 */
export async function sendEventUpdateEmail(params: {
  to: string;
  recipientName: string;
  eventTitle: string;
  updateTitle?: string;
  updateMessage: string;
  eventDate: string;
  eventTime?: string;
  eventVenue: string;
  eventId?: string;
  eventUrl?: string;
}): Promise<SendEmailResult> {
  const subject = `📢 Event Update: "${params.eventTitle}" - Festora`;
  const html = buildEventUpdateEmailHtml(params);

  return sendEmailViaResend({
    to: params.to,
    subject,
    html,
  });
}

/**
 * Send an event cancellation email to attendee
 */
export async function sendEventCancellationEmail(params: {
  to: string;
  recipientName: string;
  eventTitle: string;
  cancellationReason?: string;
  refundPolicyNotes?: string;
  eventDate: string;
  eventVenue: string;
  orderNumber?: string;
  totalAmount?: number;
  currency?: string;
}): Promise<SendEmailResult> {
  const subject = `⚠️ Event Cancelled: "${params.eventTitle}" - Festora`;
  const html = buildEventCancellationEmailHtml(params);

  return sendEmailViaResend({
    to: params.to,
    subject,
    html,
  });
}

/**
 * Send payment receipt email to attendee
 */
export async function sendPaymentReceiptEmail(params: {
  to: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  orderNumber: string;
  ticketPrice: number;
  quantity?: number;
  platformFee?: number;
  totalAmount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentDate?: string;
  ticketCode?: string;
}): Promise<SendEmailResult> {
  const subject = `💳 Payment Receipt: "${params.eventTitle}" - Festora`;
  const html = buildPaymentReceiptEmailHtml(params);

  return sendEmailViaResend({
    to: params.to,
    subject,
    html,
  });
}

/**
 * Send dynamic QR coupon / pass email to attendee (Food Coupon, Workshop Pass, VIP Lounge, etc.)
 */
export async function sendDynamicQrEmailViaResend(params: {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  fieldName: string;
  qrName: string;
  qrDescription?: string;
  code: string;
  validDayNumber?: number | 'all';
  eventDate?: string;
  viewCouponUrl?: string;
}): Promise<SendEmailResult> {
  const cleanEvent = (params.eventTitle || '').replace(/[<>"']/g, '').trim();
  const subject = `🎟️ ${params.fieldName}: "${params.qrName || params.fieldName}" - ${cleanEvent || 'Festora'}`;
  const html = buildDynamicQrEmailHtml(params);

  return sendEmailViaResend({
    to: params.recipientEmail,
    subject,
    html,
  });
}


