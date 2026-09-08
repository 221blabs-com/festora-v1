// Email service utilities for easy integration with Resend & Brevo
import { sendTicketConfirmationEmailViaResend } from './resend-email';
import { sendEmail, emailTemplates } from './email';

export async function sendOrderConfirmationEmail(orderData: {
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
}) {
  const targetEmail = (orderData.customerEmail || '').trim();
  if (!targetEmail || !targetEmail.includes('@')) {
    console.warn('⚠️ Skipping email send: invalid recipient address:', targetEmail);
    return { success: false, error: 'Invalid recipient email' };
  }

  try {
    const result = await sendTicketConfirmationEmailViaResend({
      ...orderData,
      customerEmail: targetEmail,
    });

    if (result.success) {
      console.log('✅ Order confirmation ticket email sent successfully via Resend to:', targetEmail);
      return result;
    } else {
      console.warn('⚠️ Resend returned error, trying fallback:', result.error);
    }
  } catch (error) {
    console.warn('⚠️ Resend exception, trying fallback:', error);
  }

  // Fallback to SMTP/Brevo if Resend fails or is unconfigured
  try {
    const cleanEvent = (orderData.eventTitle || '').replace(/[<>"']/g, '').trim();
    const senderName = cleanEvent ? `221blabs.festora - ${cleanEvent}` : '221blabs.festora';
    const html = await emailTemplates.orderConfirmation(orderData);
    const result = await sendEmail({
      to: targetEmail,
      subject: `🎫 Entry Ticket: "${cleanEvent}" - Festora`,
      html,
      senderName,
    });
    return result;
  } catch (fallbackError) {
    console.error('Failed to send confirmation email via fallback:', fallbackError);
    return { success: false, error: 'Failed to send confirmation email' };
  }
}

// Generate QR code as buffer for CID attachments (Gmail compatible)
async function generateQRCodeBuffer(data: string): Promise<Buffer> {
  const QRCode = await import('qrcode');
  try {
    const qrCodeBuffer = await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      type: 'png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });
    return qrCodeBuffer;
  } catch (error) {
    console.error('Failed to generate QR code buffer:', error);
    throw error;
  }
}



export async function sendTicketsToAllTeamMembers(teamData: {
  teamName: string;
  eventTitle: string;
  orderNumber: string;
  ticketPrice: number;
  currency: string;
  eventDate: string;
  eventVenue: string;
  members: Array<{
    name: string;
    email: string;
    ticketCode: string;
  }>;
}) {
  console.log(`Sending individual tickets to ${teamData.members.length} team members...`);

  const results = [];

  for (let i = 0; i < teamData.members.length; i++) {
    const member = teamData.members[i];
    const memberEmail = (member.email || '').trim();

    if (!memberEmail || !memberEmail.includes('@')) {
      console.warn(`⚠️ Skipping team member #${i + 1} (${member.name}): invalid email '${memberEmail}'`);
      continue;
    }

    try {
      const result = await sendOrderConfirmationEmail({
        customerEmail: memberEmail,
        customerName: member.name,
        eventTitle: teamData.eventTitle,
        orderNumber: teamData.orderNumber,
        ticketPrice: teamData.ticketPrice,
        currency: teamData.currency,
        eventDate: teamData.eventDate,
        eventVenue: teamData.eventVenue,
        ticketCode: member.ticketCode,
        teamName: teamData.teamName,
        memberNumber: i + 1,
        totalMembers: teamData.members.length,
        isIndividualTicket: false
      });

      results.push({
        success: result.success,
        email: memberEmail,
        name: member.name,
        data: result
      });

      console.log(`✅ Ticket sent to team member: ${member.name} (${memberEmail})`);

      // Pacing delay between emails
      await new Promise(resolve => setTimeout(resolve, 300));

    } catch (error: unknown) {
      console.error(`❌ Failed to send ticket to ${member.name} (${memberEmail}):`, error);
      results.push({
        success: false,
        email: memberEmail,
        name: member.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`📊 Email sending complete: ${successful} successful, ${failed} failed`);

  return results;
}

export async function sendEventRequestConfirmationEmail(requestData: {
  organizerEmail: string;
  organizerName: string;
  eventTitle: string;
  requestId: string;
}) {
  try {
    const subject = `📝 Event Request Received - ${requestData.eventTitle}`;
    const html = emailTemplates.eventRequestReceived(requestData);

    const result = await sendEmail({
      to: requestData.organizerEmail,
      subject,
      html,
      senderName: 'Festora'
    });

    if (result.success) {
      console.log('Event request confirmation email sent successfully via SMTP');
      return result;
    } else {
      throw new Error(result.error || 'Failed to send request confirmation email');
    }
  } catch (error) {
    console.error('Failed to send event request confirmation email:', error);
    throw error;
  }
}
