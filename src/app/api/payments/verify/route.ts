import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, auth } from '@/lib/firebase-admin';
import { processPaidOrder } from '@/lib/order-processing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: missing authorization token' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decoded;
    try {
      decoded = await auth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: 'Unauthorized: invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = body;

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return NextResponse.json(
        { error: 'Missing required payment verification parameters' },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      console.error('RAZORPAY_KEY_SECRET is not configured');
      return NextResponse.json(
        { error: 'Server configuration error: missing Razorpay secret' },
        { status: 500 }
      );
    }

    // Verify HMAC-SHA256 signature
    const signatureBody = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(signatureBody)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      console.error('Razorpay signature mismatch for order:', orderId);
      return NextResponse.json(
        { error: 'Payment verification failed: invalid signature' },
        { status: 400 }
      );
    }

    // Fetch order from Firestore
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data();
    if (orderData?.userId && orderData.userId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden: order belongs to another user' }, { status: 403 });
    }

    // Update order with payment transaction details
    await orderRef.set(
      {
        razorpayPaymentId,
        razorpayOrderId,
        razorpaySignature,
        paymentStatus: 'PAID',
        status: 'completed',
        paymentCompletedAt: new Date()
      },
      { merge: true }
    );

    // Process paid order: generates tickets in Firestore & sends confirmation emails
    const result = await processPaidOrder(orderId);

    return NextResponse.json({
      success: true,
      orderId,
      status: 'completed',
      message: 'Payment verified and tickets issued successfully',
      ...result
    });

  } catch (error: unknown) {
    console.error('Error during payment verification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal verification error' },
      { status: 500 }
    );
  }
}
