// Email service utilities for easy integration with Brevo
import { sendEmail, emailTemplates, sendEmailWithQRAttachment } from './email';

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
  try {
    const subject = `🎫 Your Ticket for ${orderData.eventTitle} - Festora`;
    const html = await emailTemplates.orderConfirmation(orderData);

    // Use the new QR attachment method for Gmail compatibility
    const qrCodeBuffer = await generateQRCodeBuffer(orderData.ticketCode);

    const result = await sendEmailWithQRAttachment({
      to: orderData.customerEmail,
      subject,
      html,
      qrCodeBuffer,
      ticketCode: orderData.ticketCode,
      senderName: 'Festora'
    });

    if (result.success) {
      console.log('Order confirmation email sent successfully via SMTP to:', orderData.customerEmail);
      return result;
    } else {
      throw new Error(result.error || 'Failed to send confirmation email');
    }
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    throw error;
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

    try {
      const result = await sendOrderConfirmationEmail({
        customerEmail: member.email,
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
        success: true,
        email: member.email,
        name: member.name,
        data: result
      });

      console.log(`✅ Ticket sent to ${member.name} (${member.email})`);

      // Small delay to avoid overwhelming the SMTP server
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: unknown) {
      console.error(`❌ Failed to send ticket to ${member.name} (${member.email}):`, error);
      results.push({
        success: false,
        email: member.email,
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
