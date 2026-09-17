import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailTemplates } from '../../../lib/email';

export async function POST(request: NextRequest) {
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
