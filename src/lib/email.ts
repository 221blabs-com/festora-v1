import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

// Check environment variables at runtime, not import time (to allow builds without env vars)
const checkEmailConfig = () => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is required for sending emails');
  }
  if (!process.env.SMTP_USER) {
    throw new Error('SMTP_USER is required for sending emails');
  }
};

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  senderName?: string;
}



export async function sendEmail({ to, subject, html, senderName = 'Festora' }: EmailData) {
  if (process.env.RESEND_API_KEY) {
    const { sendEmailViaResend } = await import('./resend-email');
    return await sendEmailViaResend({
      to,
      subject,
      html,
      from: process.env.RESEND_FROM_EMAIL || `${senderName} <tickets@221blabs.festora.com>`,
    });
  }
  return await sendEmailViaSMTP({ to, subject, html, senderName });
}

// Export the new Gmail-compatible email function
export async function sendEmailWithQRAttachment({ to, subject, html, qrCodeBuffer, ticketCode, senderName = 'Festora' }: {
  to: string;
  subject: string;
  html: string;
  qrCodeBuffer: Buffer;
  ticketCode: string;
  senderName?: string;
}) {
  if (process.env.RESEND_API_KEY) {
    const { sendEmailViaResend } = await import('./resend-email');
    return await sendEmailViaResend({
      to,
      subject,
      html,
      from: process.env.RESEND_FROM_EMAIL || `${senderName} <tickets@221blabs.festora.com>`,
      attachments: [{
        filename: `ticket-${ticketCode}-qr.png`,
        content: qrCodeBuffer.toString('base64'),
        content_type: 'image/png'
      }]
    });
  }
  checkEmailConfig();
  try {
    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.BREVO_API_KEY!,
      },
    });

    // Replace any existing base64 QR code references with CID reference
    const htmlWithCID = html.replace(
      /src="data:image\/png;base64,[^"]*"/g,
      'src="cid:qrcode"'
    ).replace(
      /src='data:image\/png;base64,[^']*'/g,
      "src='cid:qrcode'"
    );

    // Create email with QR code as CID attachment
    const mailOptions = {
      from: `${senderName} <noreply@festora.foo>`,
      to: to,
      subject: subject,
      html: htmlWithCID,
      attachments: [{
        filename: `qr-${ticketCode}.png`,
        content: qrCodeBuffer,
        contentType: 'image/png',
        cid: 'qrcode' // Referenced in HTML as src="cid:qrcode"
      }]
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      data: {
        messageId: info.messageId,
        response: info.response
      }
    };
  } catch (error: unknown) {
    console.error('Failed to send email with QR attachment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Note: Brevo REST API v4 removed TransactionalEmailsApi.
// All email sending now goes through SMTP via nodemailer.

async function sendEmailViaSMTP({ to, subject, html, senderName }: EmailData) {
  checkEmailConfig();
  try {
    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER, // Your SMTP login from Brevo
        pass: process.env.BREVO_API_KEY!, // Your SMTP key
      },
    });

    // Send email
    const mailOptions = {
      from: `${senderName} <noreply@festora.foo>`,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      data: {
        messageId: info.messageId,
        response: info.response
      }
    };
  } catch (error: unknown) {
    console.error('Failed to send email via SMTP:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

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

// Email Templates
export const emailTemplates = {
  orderConfirmation: async (data: {
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
  }) => {
    // Generate QR code for the ticket
    const qrCodeDataURL = await generateQRCode(data.ticketCode);

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Ticket Confirmation - Festora</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #f3f4f6;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 8px;
        }
        .success-badge {
          background: #10b981;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          display: inline-block;
          margin-bottom: 16px;
        }
        .event-details {
          background: #f8fafc;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
          border-left: 4px solid #4f46e5;
        }
        .ticket-info {
          background: #1f2937;
          color: white;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
          text-align: center;
        }
        .ticket-code {
          font-family: 'Courier New', monospace;
          font-size: 16px;
          font-weight: bold;
          background: rgba(255, 255, 255, 0.1);
          padding: 12px;
          border-radius: 6px;
          margin: 16px 0;
          word-break: break-all;
        }
        .qr-code {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin: 20px auto;
          display: inline-block;
        }
        .qr-code img {
          display: block;
          margin: 0 auto;
          max-width: 200px;
          height: auto;
        }
        .team-info {
          background: #f0f9ff;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border: 1px solid #0ea5e9;
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
        .button {
          display: inline-block;
          background: #4f46e5;
          color: white;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 16px 0;
        }
        .important-note {
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          padding: 16px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Festora</div>
          <div class="success-badge">✓ Registration Confirmed</div>
          <h1>Your ticket is ready!</h1>
        </div>

        <p>Hi ${data.customerName},</p>
        <p>Your registration for <strong>${data.eventTitle}</strong> has been confirmed. ${data.isIndividualTicket ? 'Here is your individual ticket:' : 'We\'re excited to see you there!'}</p>

        <div class="event-details">
          <h3>📅 Event Details</h3>
          <p><strong>Event:</strong> ${data.eventTitle}</p>
          <p><strong>Date:</strong> ${new Date(data.eventDate).toLocaleDateString('en-GB', { 
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
          <p><strong>Venue:</strong> ${data.eventVenue}</p>
          <p><strong>Order Number:</strong> ${data.orderNumber}</p>
          ${data.ticketPrice > 0 ? `<p><strong>Ticket Price:</strong> ${data.currency} ${data.ticketPrice}</p>` : '<p><strong>Registration:</strong> Free Event</p>'}
        </div>

        <div class="ticket-info">
          <h3>🎫 Your Personal Ticket</h3>
          
          <div class="qr-code">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(data.ticketCode)}&margin=1" alt="QR Code for ${data.ticketCode}" style="display: block; margin: 0 auto; max-width: 200px; height: auto;" />
          </div>
          <p><strong>Scan this QR code at the venue for entry</strong></p>
          
          <p>Ticket Code:</p>
          <div class="ticket-code">${data.ticketCode}</div>
          <p><em>Show this QR code or ticket code at the venue for entry</em></p>
        </div>

        ${data.teamName ? `
        <div class="team-info">
          <h3>👥 Team Registration</h3>
          <p><strong>Team Name:</strong> ${data.teamName}</p>
          ${data.memberNumber && data.totalMembers ? `
          <p><strong>Your Position:</strong> Member ${data.memberNumber} of ${data.totalMembers}</p>
          <p><em>Each team member receives their own individual ticket</em></p>
          ` : ''}
        </div>
        ` : ''}

        <div class="important-note">
          <h4>⚠️ Important Information</h4>
          <ul>
            <li>Please arrive 30 minutes before the event starts</li>
            <li>Bring a valid ID for verification</li>
            <li>This ticket is personal and non-transferable</li>
            <li>Show your QR code for entry scanning</li>
            <li>Keep this email safe - it contains your entry pass</li>
          </ul>
        </div>

        <div style="text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/events" class="button">View All Events</a>
        </div>

        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:festora@gmail.com">festora@gmail.com</a></p>
          <p>© 2025 Festora. All rights reserved.</p>
          <p>This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
    `;
  },

  eventRequestReceived: (data: {
    organizerName: string;
    eventTitle: string;
    requestId: string;
  }) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Event Request Received - Festora</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f8f9fa;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #f3f4f6;
        }
        .logo {
          font-size: 32px;
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 8px;
        }
        .status-badge {
          background: #3b82f6;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          display: inline-block;
          margin-bottom: 16px;
        }
        .request-details {
          background: #f8fafc;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
          border-left: 4px solid #4f46e5;
        }
        .next-steps {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          color: #6b7280;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Festora</div>
          <div class="status-badge">📝 Request Received</div>
          <h1>Thank you for your event request!</h1>
        </div>

        <p>Hi ${data.organizerName},</p>
        <p>We've successfully received your event request. Our team will review it and get back to you within 24-48 hours.</p>

        <div class="request-details">
          <h3>📋 Request Details</h3>
          <p><strong>Event Title:</strong> ${data.eventTitle}</p>
          <p><strong>Request ID:</strong> ${data.requestId}</p>
          <p><strong>Submitted:</strong> ${new Date().toLocaleDateString('en-GB', { 
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>

        <div class="next-steps">
          <h3>🚀 What happens next?</h3>
          <ol>
            <li>Our team reviews your event details</li>
            <li>We'll contact you for any clarifications needed</li>
            <li>Once approved, we'll create your event page</li>
            <li>You'll receive login credentials for the organizer dashboard</li>
            <li>Your event goes live and registration opens!</li>
          </ol>
        </div>

        <p>In the meantime, feel free to prepare any additional materials like event banners, detailed descriptions, or sponsor information.</p>

        <div class="footer">
          <p>Questions? Reply to this email or contact us at <a href="mailto:support@festora.foo">support@festora.foo</a></p>
          <p>© 2025 Festora. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `
};
