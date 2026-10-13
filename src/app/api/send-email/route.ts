import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '../../../lib/email';
import { requireSystemAdmin } from '@/lib/admin-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// No legitimate caller currently found for this route (order confirmations
// and event-request receipts are sent server-side by order-processing.ts
// and the request-handling routes directly). Left in place but locked down
// rather than removed, in case something relies on it - it was previously
// reachable by anyone, with no auth or rate limit, to send Festora-branded
// email to any address.
export async function POST(request: NextRequest) {
  const authError = requireSystemAdmin(request);
  if (authError) return authError;

  const ip = getClientIp(request);
  const rateLimitResult = checkRateLimit(`send-email:${ip}`, 10);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitResult.headers }
    );
  }

  try {
    const body = await request.json();
    const { type, data } = body;

    let emailHtml: string;
    let subject: string;

    switch (type) {
      case 'orderConfirmation':
        subject = `🎫 Your Ticket for ${data.eventTitle} - Festora`;
        emailHtml = await emailTemplates.orderConfirmation(data);
        break;

      case 'eventRequestReceived':
        subject = `📝 Event Request Received - ${data.eventTitle}`;
        emailHtml = emailTemplates.eventRequestReceived(data);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    const result = await sendEmail({
      to: data.email || data.customerEmail,
      subject,
      html: emailHtml,
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully via Brevo',
        data: result.data || { id: result.id }
      });
    } else {
      console.error('Email sending failed:', result.error);
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Email API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
