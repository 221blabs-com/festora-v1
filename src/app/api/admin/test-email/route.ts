import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { sendEmailViaSMTP, hasSmtpConfig } from '@/lib/email';
import { sendEmailViaResend } from '@/lib/resend-email';

export const dynamic = 'force-dynamic';

// This endpoint can send live test emails and reveal (masked) config state,
// so it must not be publicly reachable - only a signed-in Firestore admin
// (same check used by /api/admin/requests) may call it.
async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
  }
  if (!auth) {
    return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
  }
  try {
    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Access denied. Admin privileges required.' }, { status: 403 });
    }
    return null;
  } catch {
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
  }
}

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

  // Sending a live test email is gated behind admin auth - unlike the plain
  // status check above, this can relay mail to an arbitrary address using
  // the site's Resend/SMTP quota, so it must not be publicly callable.
  const authError = await requireAdmin(request);
  if (authError) return authError;

  const results: Record<string, unknown> = {
    to,
    provider,
    config: configDiagnosis,
  };

  // 'auto' (the default) tests every configured channel in one call so a
  // single hit of this endpoint tells you exactly which provider(s), if
  // any, are actually able to deliver mail from this deployment.
  const shouldTestResend = provider === 'resend' || provider === 'auto';
  const shouldTestSmtp = provider === 'smtp' || provider === 'auto';

  if (shouldTestResend) {
    if (process.env.RESEND_API_KEY) {
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
      results.resendResult = {
        success: false,
        error: 'RESEND_API_KEY not configured in this deployment environment.',
      };
    }
  }

  if (shouldTestSmtp) {
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
