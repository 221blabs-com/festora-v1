import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as crypto from 'crypto';
import { processPaidOrder } from '@/lib/order-processing';

const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const parsed = JSON.parse(rawBody || '{}');

    const razorpaySignature = request.headers.get('x-razorpay-signature');
    const cashfreeSignature = request.headers.get('x-webhook-signature');

    // 1. Handle Razorpay Webhook
    if (razorpaySignature && RAZORPAY_WEBHOOK_SECRET) {
      const expectedSignature = crypto
        .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        console.error('Invalid Razorpay webhook signature');
        return new NextResponse('Invalid signature', { status: 400 });
      }

      const eventType = parsed.event;
      const orderEntity = parsed.payload?.order?.entity;
      const paymentEntity = parsed.payload?.payment?.entity;
      const orderId = orderEntity?.receipt || paymentEntity?.notes?.orderId;

      if (orderId && (eventType === 'order.paid' || eventType === 'payment.captured')) {
        try {
          await db.collection('orders').doc(orderId).set({
            status: 'completed',
            paymentStatus: 'PAID',
            razorpayPaymentId: paymentEntity?.id,
            razorpayOrderId: orderEntity?.id || paymentEntity?.order_id,
            paidAt: new Date()
          }, { merge: true });
          await processPaidOrder(orderId);
        } catch (e) {
          console.error('Razorpay webhook order processing failed:', e);
          return new NextResponse('Processing failure', { status: 500 });
        }
      }

      return new NextResponse('OK', { status: 200 });
    }

    // 2. Handle Cashfree Webhook (legacy fallback)
    if (cashfreeSignature && CASHFREE_CLIENT_SECRET) {
      const timestamp = request.headers.get('x-webhook-timestamp');
      if (!timestamp) return new NextResponse('Missing signature headers', { status: 400 });

      const expectedSignature = crypto
        .createHmac('sha256', CASHFREE_CLIENT_SECRET)
        .update(timestamp + rawBody)
        .digest('base64');

      if (cashfreeSignature !== expectedSignature) {
        console.error('Invalid Cashfree webhook signature');
        return new NextResponse('Invalid signature', { status: 400 });
      }

      const { data } = parsed;
      const { order } = data || {};
      if (order) {
        const { order_id, order_status, payment_status } = order;
        if (payment_status === 'SUCCESS' && order_status === 'PAID') {
          await processPaidOrder(order_id);
        } else if (payment_status === 'FAILED' || order_status === 'CANCELLED') {
          await db.collection('orders').doc(order_id).set(
            { status: 'failed', failedAt: new Date() },
            { merge: true }
          );
        }
      }
      return new NextResponse('OK', { status: 200 });
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
