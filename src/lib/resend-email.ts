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
  });

  const _deprecatedTicketHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#080a0f;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f1f5f9;">
  <div style="max-width:620px;margin:0 auto;padding:40px 16px;">
    
    <!-- Outer Card -->
    <div style="background-color:#121620;border:1px solid #2a3142;border-radius:14px;overflow:hidden;box-shadow:0 16px 36px rgba(0,0,0,0.6);">
      
      <!-- Gold Top Bar -->
      <div style="height:5px;background:linear-gradient(90deg, #d4af37 0%, #fef08a 50%, #d4af37 100%);"></div>

      <!-- Brand Header -->
      <div style="background:linear-gradient(180deg, #181d2a 0%, #121620 100%);padding:32px 28px 24px;border-bottom:1px solid #242b3b;text-align:center;">
        <h1 style="margin:0;font-size:30px;letter-spacing:5px;color:#d4af37;text-transform:uppercase;font-weight:900;">
          FESTORA
        </h1>
        <p style="margin:6px 0 0;font-size:12px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;">
          Official Event Entry Ticket &amp; Gate Pass
        </p>

        <!-- Status Badge -->
        <div style="margin-top:16px;">
          <span style="display:inline-block;background-color:rgba(16,185,129,0.15);border:1px solid #10b981;color:#10b981;padding:6px 18px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
            ✓ Registration Confirmed &amp; Valid
          </span>
        </div>
      </div>

      <!-- Main Content -->
      <div style="padding:32px 28px;">
        <p style="font-size:16px;line-height:1.6;color:#ffffff;margin:0 0 12px;">
          Hello <strong>${customerName || 'Attendee'}</strong>,
        </p>
        <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0 0 24px;">
          Your registration for <strong>"${eventTitle}"</strong> has been successfully processed! Your entry pass with a unique verification QR code is provided below.
        </p>

        <!-- Section 1: Event Details Card -->
        <div style="background-color:#0b0e14;border:1px solid #d4af37;border-radius:10px;padding:22px;margin:24px 0;">
          <h2 style="margin:0 0 16px;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;font-weight:800;border-bottom:1px solid rgba(212,175,55,0.25);padding-bottom:10px;">
            📅 Event Information
          </h2>

          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;width:120px;">
                Event:
              </td>
              <td style="padding:8px 0;font-size:16px;color:#ffffff;font-weight:700;">
                ${eventTitle}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Date &amp; Time:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;font-weight:600;">
                ${formattedSchedule}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Venue:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;font-weight:600;">
                ${eventVenue || 'Venue to be announced'}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Order ID:
              </td>
              <td style="padding:8px 0;font-size:13px;color:#d4af37;font-family:monospace;font-weight:700;">
                ${orderNumber}
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Ticket Price:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#ffffff;font-weight:700;">
                ${ticketPrice > 0 ? `${currency} ${ticketPrice}` : 'Free Registration'}
              </td>
            </tr>
            ${
              platformFee !== undefined && platformFee > 0
                ? `
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Platform Fee:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#d4af37;font-weight:700;">
                ${currency} ${platformFee}
              </td>
            </tr>
            `
                : ''
            }
            ${
              totalAmount !== undefined && totalAmount > 0
                ? `
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Total Paid:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#10b981;font-weight:700;">
                ${currency} ${totalAmount}
              </td>
            </tr>
            `
                : ''
            }
            ${
              showTeamRow
                ? `
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Team:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#38bdf8;font-weight:600;">
                ${teamName} ${memberNumber && totalMembers ? `(Member ${memberNumber} of ${totalMembers})` : ''}
              </td>
            </tr>
            `
                : ''
            }
          </table>
        </div>

        <!-- Section 2: Organizer Details -->
        ${
          organizerName || organizerEmail || organizerPhone
            ? `
        <div style="background-color:#0b0e14;border:1px solid #242b3b;border-radius:10px;padding:18px 22px;margin:20px 0;">
          <h3 style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;font-weight:700;border-bottom:1px solid #242b3b;padding-bottom:8px;">
            🏢 Event Organizer Details
          </h3>
          <table style="width:100%;border-collapse:collapse;">
            ${
              organizerName
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;width:120px;">Organizer:</td>
              <td style="padding:6px 0;font-size:14px;color:#ffffff;font-weight:600;">${organizerName}</td>
            </tr>
            `
                : ''
            }
            ${
              organizerEmail
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Email:</td>
              <td style="padding:6px 0;font-size:13px;color:#d4af37;">
                <a href="mailto:${organizerEmail}" style="color:#d4af37;text-decoration:none;">${organizerEmail}</a>
              </td>
            </tr>
            `
                : ''
            }
            ${
              organizerPhone
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Contact:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${organizerPhone}</td>
            </tr>
            `
                : ''
            }
          </table>
        </div>
        `
            : ''
        }

        <!-- Section 3: Participant Registration Details -->
        <div style="background-color:#0b0e14;border:1px solid #242b3b;border-radius:10px;padding:18px 22px;margin:20px 0;">
          <h3 style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;font-weight:700;border-bottom:1px solid #242b3b;padding-bottom:8px;">
            👤 Participant Registration Details
          </h3>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;width:130px;">Attendee Name:</td>
              <td style="padding:6px 0;font-size:14px;color:#ffffff;font-weight:600;">${customerName}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Email Address:</td>
              <td style="padding:6px 0;font-size:13px;color:#d4af37;">${customerEmail}</td>
            </tr>
            ${
              participantDetails?.phone
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Phone Number:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${participantDetails.phone}</td>
            </tr>
            `
                : ''
            }
            ${
              participantDetails?.college
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">College/Institute:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${participantDetails.college}</td>
            </tr>
            `
                : ''
            }
            ${
              participantDetails?.department
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Department:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${participantDetails.department}</td>
            </tr>
            `
                : ''
            }
            ${
              participantDetails?.rollNumber
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Roll / Reg ID:</td>
              <td style="padding:6px 0;font-size:13px;color:#93c5fd;font-family:monospace;">${participantDetails.rollNumber}</td>
            </tr>
            `
                : ''
            }
            ${
              participantDetails?.year
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Year of Study:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${participantDetails.year}</td>
            </tr>
            `
                : ''
            }
            ${
              participantDetails?.gender
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">Gender:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${participantDetails.gender}</td>
            </tr>
            `
                : ''
            }
            ${
              participantDetails?.tshirtSize
                ? `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">T-Shirt Size:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${participantDetails.tshirtSize}</td>
            </tr>
            `
                : ''
            }
            ${
              customAnswerEntries.map(
                ([q, a]) => `
            <tr>
              <td style="padding:6px 0;font-size:12px;color:#94a3b8;">${q}:</td>
              <td style="padding:6px 0;font-size:13px;color:#f1f5f9;">${a}</td>
            </tr>
            `
              ).join('')
            }
          </table>
        </div>

        <!-- Section 4: Ticket & QR Code -->
        <div style="background:linear-gradient(180deg, #181d2a 0%, #10141d 100%);border:2px solid #2a3142;border-radius:12px;padding:28px 20px;margin:28px 0;text-align:center;">
          <h3 style="margin:0 0 6px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;font-weight:800;">
            🎟️ Entry Pass &amp; Verification QR Code
          </h3>
          <p style="margin:0 0 20px;font-size:12px;color:#94a3b8;">
            Present this unique QR code at the event entrance for verification and entry check-in
          </p>

          <!-- QR Code Box -->
          <div style="display:inline-block;background-color:#ffffff;padding:16px;border-radius:12px;border:3px solid #d4af37;box-shadow:0 8px 24px rgba(212,175,55,0.25);">
            <img 
              src="${qrImageSrc}" 
              alt="Ticket QR Code for ${ticketCode}" 
              width="210" 
              height="210" 
              style="display:block;margin:0 auto;border:0;"
            />
          </div>

          <!-- Ticket Code Display -->
          <div style="margin-top:20px;">
            <p style="margin:0 0 6px;font-size:11px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;font-weight:700;">
              Unique Ticket Pass Code
            </p>
            <div style="display:inline-block;background-color:#080a0f;border:1px solid #334155;border-radius:6px;padding:8px 24px;font-family:monospace;font-size:16px;color:#f8fafc;font-weight:700;letter-spacing:2px;">
              ${ticketCode}
            </div>
          </div>
        </div>

        <!-- Action Button -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${ticketsUrl}" style="display:inline-block;background:linear-gradient(135deg, #d4af37 0%, #aa8624 100%);color:#080a0f;text-decoration:none;padding:15px 36px;border-radius:8px;font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;box-shadow:0 4px 20px rgba(212,175,55,0.35);">
            View &amp; Download Ticket in App
          </a>
        </div>

        <!-- Venue Guidelines -->
        <div style="background-color:#161c28;border-left:4px solid #d4af37;border-radius:6px;padding:18px;margin:24px 0;">
          <h4 style="margin:0 0 8px;font-size:13px;color:#ffffff;text-transform:uppercase;letter-spacing:1px;">
            ⚠️ Entry Instructions
          </h4>
          <ul style="margin:0;padding-left:18px;color:#94a3b8;font-size:12px;line-height:1.7;">
            <li>Please arrive at least 15 minutes before the event start time.</li>
            <li>Have this email or the downloaded pass open on your smartphone.</li>
            <li>A PNG image of your QR code has also been attached to this email.</li>
            <li>Each ticket is unique and cannot be checked in more than once.</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color:#0b0e14;padding:22px 28px;border-top:1px solid #242b3b;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
          Need assistance? Contact support at <a href="mailto:festora@221blabs.com" style="color:#d4af37;text-decoration:none;">festora@221blabs.com</a>
        </p>
        <p style="margin:0;font-size:11px;color:#475569;">
          &copy; ${new Date().getFullYear()} Festora (221blabs.com). All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
  void _deprecatedTicketHtml;

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

  const _deprecatedEnterpriseHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Enterprise Inquiry - Festora</title>
</head>
<body style="margin:0;padding:0;background-color:#07090e;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#e2e8f0;">
  <div style="background-color:#07090e;padding:30px 15px;">
    <div style="max-width:650px;margin:0 auto;background-color:#0e121a;border:1px solid #d4af37;border-radius:4px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
      
      <!-- Top Gold Line -->
      <div style="height:3px;background:linear-gradient(90deg,#996515,#d4af37,#fef1b5,#d4af37,#996515);"></div>

      <!-- Header -->
      <div style="padding:30px 30px 24px;border-bottom:1px solid #1c2230;text-align:center;background:radial-gradient(ellipse at top,#192133 0%,#0e121a 100%);">
        <div style="display:inline-block;padding:4px 14px;border:1px solid #d4af37;margin-bottom:12px;">
          <span style="color:#d4af37;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">
            ENTERPRISE INQUIRY • LET'S TALK
          </span>
        </div>
        <h1 style="margin:0 0 6px;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
          Festora Enterprise Request
        </h1>
        <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:1px;">
          Reference ID: <strong style="color:#d4af37;">${inquiryId}</strong> &bull; Received ${submittedAt} (IST)
        </p>
      </div>

      <div style="padding:28px 30px;">
        <!-- Lead Highlight Box -->
        <div style="background-color:#141a24;border-left:4px solid #d4af37;padding:16px 20px;margin-bottom:24px;border-radius:2px;">
          <div style="font-size:11px;color:#d4af37;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;margin-bottom:4px;">Inquiring Organization</div>
          <div style="font-size:20px;color:#ffffff;font-weight:700;letter-spacing:0.5px;">${organization}</div>
          <div style="font-size:13px;color:#94a3b8;margin-top:2px;">Contact: <strong style="color:#e2e8f0;">${name}</strong> (${role})</div>
        </div>

        <!-- Contact Details -->
        <h3 style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;border-bottom:1px solid #1c2230;padding-bottom:6px;">
          Requester Contact Information
        </h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;">Full Name:</td>
            <td style="padding:8px 0;color:#ffffff;font-size:14px;font-weight:600;">${name}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">Official Email:</td>
            <td style="padding:8px 0;color:#d4af37;font-size:14px;font-weight:600;">
              <a href="mailto:${email}" style="color:#d4af37;text-decoration:none;">${email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">Phone / WhatsApp:</td>
            <td style="padding:8px 0;color:#ffffff;font-size:14px;font-weight:600;">
              <a href="tel:${phone}" style="color:#ffffff;text-decoration:none;">${phone}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">Designation / Role:</td>
            <td style="padding:8px 0;color:#cbd5e1;font-size:14px;">${role}</td>
          </tr>
        </table>

        <!-- Event Scope -->
        <h3 style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;border-bottom:1px solid #1c2230;padding-bottom:6px;">
          Event Scope & Specifications
        </h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;">Expected Scale:</td>
            <td style="padding:8px 0;color:#22c55e;font-size:14px;font-weight:700;">${attendees}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">Event Format / Type:</td>
            <td style="padding:8px 0;color:#ffffff;font-size:14px;">${eventType}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#64748b;font-size:13px;">Target Timeline:</td>
            <td style="padding:8px 0;color:#cbd5e1;font-size:14px;">${timeline}</td>
          </tr>
        </table>

        <!-- Message / Requirements -->
        <h3 style="margin:0 0 12px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;border-bottom:1px solid #1c2230;padding-bottom:6px;">
          Requirements & Message
        </h3>
        <div style="background-color:#141a24;border:1px solid #1e2638;padding:18px;border-radius:3px;color:#e2e8f0;font-size:13.5px;line-height:1.7;margin-bottom:28px;white-space:pre-wrap;">
${message}
        </div>

        <!-- Direct Reply CTA -->
        <div style="text-align:center;padding:10px 0;">
          <a href="mailto:${email}?subject=Re:%20Festora%20Enterprise%20Inquiry%20[${inquiryId}]" 
             style="display:inline-block;padding:14px 32px;background-color:#d4af37;color:#07090e;font-size:13px;font-weight:700;text-decoration:none;letter-spacing:2px;text-transform:uppercase;border-radius:2px;">
            Reply Directly to ${name}
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color:#07090e;padding:18px 30px;border-top:1px solid #1c2230;text-align:center;">
        <p style="margin:0;font-size:11px;color:#475569;letter-spacing:1px;text-transform:uppercase;">
          Festora Enterprise Inbound Lead Dispatch &bull; 221B Labs
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;

  // 2. Requester Receipt Confirmation Email
  const customerSubject = `We've Received Your Enterprise Request — Festora`;
  const customerHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Enterprise Inquiry Received - Festora</title>
</head>
<body style="margin:0;padding:0;background-color:#07090e;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;color:#e2e8f0;">
  <div style="background-color:#07090e;padding:30px 15px;">
    <div style="max-width:620px;margin:0 auto;background-color:#0e121a;border:1px solid #d4af37;border-radius:4px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
      
      <!-- Top Gold Line -->
      <div style="height:3px;background:linear-gradient(90deg,#996515,#d4af37,#fef1b5,#d4af37,#996515);"></div>

      <!-- Header -->
      <div style="padding:32px 30px 24px;border-bottom:1px solid #1c2230;text-align:center;background:radial-gradient(ellipse at top,#192133 0%,#0e121a 100%);">
        <div style="display:inline-block;padding:4px 14px;border:1px solid #d4af37;margin-bottom:12px;">
          <span style="color:#d4af37;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">
            FESTORA ENTERPRISE
          </span>
        </div>
        <h1 style="margin:0 0 6px;color:#ffffff;font-size:23px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
          Thank You, ${name}
        </h1>
        <p style="margin:0;color:#94a3b8;font-size:13px;letter-spacing:0.5px;">
          Your request for <strong style="color:#ffffff;">${organization}</strong> has been received
        </p>
      </div>

      <div style="padding:28px 30px;">
        <p style="margin:0 0 16px;color:#e2e8f0;font-size:14px;line-height:1.7;">
          Thank you for reaching out regarding Festora Enterprise. Our dedicated solutions team is reviewing your requirements and will reach out to you within <strong>24 business hours</strong> to discuss customized ticketing, white-label options, and dedicated support for your events.
        </p>

        <!-- Summary Box -->
        <div style="background-color:#141a24;border:1px solid #1e2638;padding:20px;border-radius:3px;margin:24px 0;">
          <div style="font-size:11px;color:#d4af37;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:12px;border-bottom:1px solid #1c2230;padding-bottom:6px;">
            Inquiry Summary [Ref: ${inquiryId}]
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12.5px;width:130px;">Organization:</td>
              <td style="padding:6px 0;color:#ffffff;font-size:13px;font-weight:600;">${organization}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12.5px;">Event Type:</td>
              <td style="padding:6px 0;color:#cbd5e1;font-size:13px;">${eventType}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12.5px;">Estimated Scale:</td>
              <td style="padding:6px 0;color:#cbd5e1;font-size:13px;">${attendees}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;color:#64748b;font-size:12.5px;">Timeline:</td>
              <td style="padding:6px 0;color:#cbd5e1;font-size:13px;">${timeline}</td>
            </tr>
          </table>
        </div>

        <!-- What to Expect -->
        <h3 style="margin:0 0 10px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;">
          What Happens Next?
        </h3>
        <ul style="margin:0 0 24px;padding-left:20px;color:#94a3b8;font-size:13px;line-height:1.7;">
          <li>A dedicated Festora Account Manager will review your event scale and needs.</li>
          <li>We will connect via email / phone to schedule a 15-minute live platform walkthrough.</li>
          <li>You will receive customized enterprise pricing, SLA details, and trial access.</li>
        </ul>

        <p style="margin:0;color:#64748b;font-size:12.5px;line-height:1.6;">
          If you have urgent questions or additional materials to share, simply reply directly to this email or write to us at <a href="mailto:festora@221blabs.com" style="color:#d4af37;text-decoration:none;">festora@221blabs.com</a>.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#07090e;padding:20px 30px;border-top:1px solid #1c2230;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:#d4af37;font-weight:600;letter-spacing:1px;">
          Festora Enterprise &bull; 221B Labs
        </p>
        <p style="margin:0;font-size:11px;color:#475569;">
          &copy; ${new Date().getFullYear()} Festora. All rights reserved.
        </p>
      </div>

    </div>
  </div>
</body>
</html>
  `;
  void _deprecatedEnterpriseHtml;

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


