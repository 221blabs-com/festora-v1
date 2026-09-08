import https from 'https';
import QRCode from 'qrcode';

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded string
  content_type?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email using Resend REST API via Node https module
 */
export async function sendEmailViaResend({
  to,
  subject,
  html,
  text,
  from,
  attachments,
}: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY || 're_ZmJkL7fA_GM2eGncBE5grXb7nRbW3cnGL';
  const sender = from || process.env.RESEND_FROM_EMAIL || '221blabs.festora <tickets@221blabs.festora.com>';

  if (!apiKey) {
    console.error('[Resend] Missing RESEND_API_KEY');
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
              resolve({ success: true, id: data.id });
            } else {
              console.error('[Resend] API Error:', res.statusCode, data);
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
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

interface OrganizerCredentialsEmailParams {
  to: string;
  organizerName: string;
  username: string;
  password?: string;
  eventTitle: string;
  eventId?: string;
  status?: 'created' | 'approved' | 'submitted';
}

/**
 * Send an email to the organizer containing their account username and password
 */
export async function sendOrganizerCredentialsEmail({
  to,
  organizerName,
  username,
  password,
  eventTitle,
  eventId,
  status = 'approved',
}: OrganizerCredentialsEmailParams): Promise<SendEmailResult> {
  const isApproved = status === 'approved';
  const isCreated = status === 'created';
  const subject = isApproved
    ? `🎉 Your Festora Organizer Account & Event "${eventTitle}" Are Live!`
    : isCreated
    ? `🎟️ Organizer Credentials for "${eventTitle}" - Festora`
    : `📋 Application Received for "${eventTitle}" - Festora`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const organizerLoginUrl = `${baseUrl}/organizer`;
  const eventUrl = eventId ? `${baseUrl}/events/${eventId}` : `${baseUrl}/events`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0d0f12;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Card Container -->
    <div style="background-color:#16191f;border:1px solid #2b303a;border-radius:12px;overflow:hidden;box-shadow:0 12px 30px rgba(0,0,0,0.5);">
      
      <!-- Brand Header -->
      <div style="background:linear-gradient(135deg, #1a1e27 0%, #0d0f12 100%);padding:36px 32px 28px;border-bottom:1px solid #2b303a;text-align:center;">
        <h1 style="margin:0;font-size:28px;letter-spacing:4px;color:#d4af37;text-transform:uppercase;font-weight:800;">
          FESTORA
        </h1>
        <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;">
          Premier Campus Event &amp; Ticketing Platform
        </p>
      </div>

      <!-- Main Body -->
      <div style="padding:36px 32px;">
        <p style="font-size:16px;line-height:1.6;color:#e5e7eb;margin:0 0 16px;">
          Hello <strong>${organizerName || 'Organizer'}</strong>,
        </p>
        
        <p style="font-size:15px;line-height:1.6;color:#9ca3af;margin:0 0 24px;">
          ${
            isApproved
              ? `Your organizer profile has been approved and your event <strong>"${eventTitle}"</strong> is now published and live on Festora!`
              : isCreated
              ? `Your organizer access for the event <strong>"${eventTitle}"</strong> has been successfully configured.`
              : `Thank you for submitting your organizer application and event <strong>"${eventTitle}"</strong>.`
          }
        </p>

        <!-- Credentials Box -->
        <div style="background-color:#0d0f12;border:1px solid #d4af37;border-radius:8px;padding:24px;margin:28px 0;">
          <h2 style="margin:0 0 16px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;font-weight:700;">
            🔐 Organizer Access Credentials
          </h2>
          
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;width:140px;">
                Username / ID:
              </td>
              <td style="padding:8px 0;font-size:16px;color:#ffffff;font-family:monospace;font-weight:700;">
                ${username}
              </td>
            </tr>
            ${
              password
                ? `
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
                Password:
              </td>
              <td style="padding:8px 0;font-size:16px;color:#d4af37;font-family:monospace;font-weight:700;">
                ${password}
              </td>
            </tr>
            `
                : ''
            }
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;">
                Event:
              </td>
              <td style="padding:8px 0;font-size:15px;color:#e5e7eb;font-weight:600;">
                ${eventTitle}
              </td>
            </tr>
          </table>
        </div>

        <!-- Action Button -->
        <div style="text-align:center;margin:32px 0;">
          <a href="${organizerLoginUrl}" style="display:inline-block;background-color:#d4af37;color:#0d0f12;text-decoration:none;padding:14px 32px;border-radius:6px;font-size:14px;font-weight:700;letter-spacing:2px;text-transform:uppercase;box-shadow:0 4px 15px rgba(212,175,55,0.3);">
            Access Organizer Dashboard
          </a>
        </div>

        <!-- Features summary -->
        <div style="background-color:#1c212a;border-radius:8px;padding:20px;margin:28px 0;border-left:4px solid #d4af37;">
          <h3 style="margin:0 0 10px;font-size:14px;color:#ffffff;">What you can do from your dashboard:</h3>
          <ul style="margin:0;padding-left:20px;color:#9ca3af;font-size:13px;line-height:1.7;">
            <li>Track live ticket sales &amp; attendee registrations</li>
            <li>Scan attendee QR codes with the venue scanner (<strong>/checkin</strong>)</li>
            <li>Verify tickets in real time to prevent duplicate entry</li>
            <li>View your live event listing at <a href="${eventUrl}" style="color:#d4af37;text-decoration:none;">View Public Event</a></li>
          </ul>
        </div>

        <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:24px 0 0;border-top:1px solid #2b303a;padding-top:20px;">
          <strong>Security Notice:</strong> Please keep these credentials confidential. Do not share your password with anyone. If you suspect unauthorized access, contact the Festora support team immediately.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color:#0d0f12;padding:20px 32px;border-top:1px solid #2b303a;text-align:center;">
        <p style="margin:0;font-size:12px;color:#6b7280;">
          &copy; ${new Date().getFullYear()} Festora. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return sendEmailViaResend({
    to,
    subject,
    html,
  });
}

export interface TicketConfirmationEmailParams {
  customerEmail: string;
  customerName: string;
  eventTitle: string;
  orderNumber: string;
  ticketPrice: number;
  currency: string;
  eventDate: string;
  eventVenue: string;
  ticketCode: string;
  teamName?: string;
  memberNumber?: number;
  totalMembers?: number;
  isIndividualTicket?: boolean;
}

/**
 * Send ticket confirmation email to attendee with complete event & ticket details and QR code
 */
export async function sendTicketConfirmationEmailViaResend({
  customerEmail,
  customerName,
  eventTitle,
  orderNumber,
  ticketPrice,
  currency,
  eventDate,
  eventVenue,
  ticketCode,
  teamName,
  memberNumber,
  totalMembers,
}: TicketConfirmationEmailParams): Promise<SendEmailResult> {
  const cleanEvent = (eventTitle || '').replace(/[<>"']/g, '').trim();
  const senderDisplayName = cleanEvent ? `221blabs.festora - ${cleanEvent}` : '221blabs.festora';
  const fromEmail = 'tickets@221blabs.festora.com';
  const from = `"${senderDisplayName}" <${fromEmail}>`;
  const subject = `🎫 Entry Ticket: "${cleanEvent || 'Event'}" - Festora | 221blabs.festora`;

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

  // Format event date nicely
  let formattedDate = 'Date to be announced';
  try {
    if (eventDate) {
      formattedDate = new Date(eventDate).toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    formattedDate = eventDate;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://221blabs.festora.com';
  const ticketsUrl = `${baseUrl}/dashboard/tickets`;
  // Use public HTTPS QR CDN image so Gmail, Outlook, Yahoo and mobile apps render it directly without blocking data: URIs
  const qrCdnUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(ticketCode)}&margin=1`;
  const qrImageSrc = qrCdnUrl;

  const html = `
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
          Official Event Entry Ticket
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
        <p style="font-size:16px;line-height:1.6;color:#ffffff;margin:0 0 16px;">
          Hello <strong>${customerName || 'Attendee'}</strong>,
        </p>
        <p style="font-size:14px;line-height:1.6;color:#94a3b8;margin:0 0 24px;">
          Your registration for <strong>"${eventTitle}"</strong> is confirmed! Your entry pass with QR verification is ready below.
        </p>

        <!-- Event Details Card -->
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
                ${formattedDate}
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
                Payment:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#10b981;font-weight:700;">
                ${ticketPrice > 0 ? `${currency} ${ticketPrice}` : 'Free Registration'}
              </td>
            </tr>
            ${
              teamName
                ? `
            <tr>
              <td style="padding:8px 0;font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">
                Team:
              </td>
              <td style="padding:8px 0;font-size:14px;color:#f1f5f9;font-weight:600;">
                ${teamName} ${memberNumber && totalMembers ? `(Member ${memberNumber} of ${totalMembers})` : ''}
              </td>
            </tr>
            `
                : ''
            }
          </table>
        </div>

        <!-- Ticket & QR Code Section -->
        <div style="background:linear-gradient(180deg, #181d2a 0%, #10141d 100%);border:2px solid #2a3142;border-radius:12px;padding:28px 20px;margin:28px 0;text-align:center;">
          <h3 style="margin:0 0 6px;font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#d4af37;font-weight:800;">
            🎟️ Entry Pass &amp; QR Code
          </h3>
          <p style="margin:0 0 20px;font-size:12px;color:#94a3b8;">
            Present this QR code directly at the venue gate for instant check-in
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
              Ticket ID / Pass Code
            </p>
            <div style="display:inline-block;background-color:#080a0f;border:1px solid #334155;border-radius:6px;padding:8px 20px;font-family:monospace;font-size:14px;color:#f8fafc;font-weight:700;letter-spacing:1px;">
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
            <li>Please arrive at least 15 minutes before the scheduled start time.</li>
            <li>Have this email or your downloaded ticket open on your phone.</li>
            <li>A copy of your QR code has also been attached to this email as a PNG file.</li>
            <li>Tickets are unique and can only be checked in once at the gate.</li>
          </ul>
        </div>
      </div>

      <!-- Footer -->
      <div style="background-color:#0b0e14;padding:22px 28px;border-top:1px solid #242b3b;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#64748b;">
          Need support? Reach out via <a href="mailto:tickets@221blabs.festora.com" style="color:#d4af37;text-decoration:none;">tickets@221blabs.festora.com</a>
        </p>
        <p style="margin:0;font-size:11px;color:#475569;">
          &copy; ${new Date().getFullYear()} Festora (221blabs.festora.com). All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Include QR code image as an attachment if generated
  const attachments: EmailAttachment[] = [];
  if (qrBase64) {
    attachments.push({
      filename: `Festora-Ticket-${ticketCode}.png`,
      content: qrBase64,
      content_type: 'image/png',
    });
  }

  return sendEmailViaResend({
    to: customerEmail,
    subject,
    html,
    from,
    attachments,
  });
}

