import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { sendWelcomeEmail } from '@/lib/email-utils';

// Sends the "Congratulations and welcome to Festora!" email exactly once per
// account, the first time it is created. Idempotency is enforced server-side
// via a `welcomeEmailSent` flag on the user's Firestore doc (set inside a
// transaction) so retries/duplicate client calls never send it twice.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const body = await request.json().catch(() => ({}));
    const name = (body?.name || decodedToken.name || 'there') as string;
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json({ success: false, error: 'No email on account' }, { status: 400 });
    }

    const userRef = db.collection('users').doc(userId);
    const shouldSend = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (userDoc.exists && userDoc.data()?.welcomeEmailSent) {
        return false;
      }
      transaction.set(userRef, {
        welcomeEmailSent: true,
        welcomeEmailSentAt: new Date().toISOString(),
      }, { merge: true });
      return true;
    });

    if (!shouldSend) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const result = await sendWelcomeEmail({ email, name });

    return NextResponse.json({ success: result.success, error: result.success ? undefined : result.error });
  } catch (error: unknown) {
    console.error('Error sending welcome email:', error);
    return NextResponse.json(
      { error: `Failed to send welcome email: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}
