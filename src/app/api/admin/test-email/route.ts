import { NextRequest, NextResponse } from 'next/server';
import { sendEmailViaSMTP, hasSmtpConfig } from '@/lib/email';
import { sendEmailViaResend } from '@/lib/resend-email';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const to = searchParams.get('to');
  const provider = searchParams.get('provider') || 'auto';

  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER)?.trim();
  const rawPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.BREVO_API_KEY;
  const host = (process.env.SMTP_HOST || (user && !user.endsWith('@gmail.com') ? 'smtp-relay.brevo.com' : 'smtp.gmail.com')).trim();
  const port = Number(process.env.SMTP_PORT) || (host === 'smtp.gmail.com' ? 465 : 587);

  const configDiagnosis = {
    smtpConfigured: hasSmtpConfig(),
    smtpUser: user ? `${user.slice(0, 3)}***@${user.split('@')[1] || 'unknown'}` : null,
    hasSmtpPass: Boolean(rawPass),
    passLength: rawPass ? rawPass.length : 0,
    passContainsSpaces: Boolean(rawPass && /\s/.test(rawPass)),
    smtpHost: host,
    smtpPort: port,
    resendConfigured: Boolean(process.env.RESEND_API_KEY),
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'tickets@221blabs.festora.com',
    vercelEnv: process.env.VERCEL_ENV || 'local',
  };

  if (!to) {
    return NextResponse.json({
      status: 'diagnostic_ready',
      message: 'Email configuration status. To send a live test, add ?to=your-email@example.com',
      config: configDiagnosis,
    });
  }

  const results: Record<string, unknown> = {
    to,
    provider,
    config: configDiagnosis,
  };

  if (provider === 'resend') {
    try {
      const resendRes = await sendEmailViaResend({
        to,
        subject: '🧪 Festora Email Test (Resend)',
        html: `
          <div style="font-family:sans-serif;padding:24px;background:#0d0f12;color:#f3f4f6;border-radius:8px;border:1px solid #d4af37;">
            <h1 style="color:#d4af37;margin-top:0;">Festora Resend Delivery Test</h1>
            <p>Your Festora email delivery via Resend API is working correctly!</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>
        `,
      });
      results.resendResult = resendRes;
    } catch (err: any) {
      results.resendResult = { success: false, error: err.message };
    }
  } else {
    // Default or SMTP
    if (hasSmtpConfig()) {
      try {
        const smtpRes = await sendEmailViaSMTP({
          to,
          subject: '🧪 Festora Email Delivery Test',
          html: `
            <div style="font-family:sans-serif;padding:24px;background:#0d0f12;color:#f3f4f6;border-radius:8px;border:1px solid #d4af37;">
              <h1 style="color:#d4af37;margin-top:0;">Festora SMTP Delivery Test</h1>
              <p>Your Festora email delivery via SMTP (${host}:${port}) is working correctly!</p>
              <p>Recipient: <strong>${to}</strong></p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
          `,
          senderName: 'Festora',
        });
        results.smtpResult = smtpRes;
      } catch (err: any) {
        results.smtpResult = { success: false, error: err.message };
      }
    } else {
      results.smtpResult = {
        success: false,
        error: 'SMTP not configured. Missing SMTP_USER or SMTP_PASS/BREVO_API_KEY environment variables.',
      };
    }
  }

  return NextResponse.json(results);
}
