import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import * as crypto from 'crypto';
import { processPaidOrder } from '@/lib/order-processing';

const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const parsed = JSON.parse(rawBody || '{}');

    const signature = request.headers.get('x-webhook-signature');
    const timestamp = request.headers.get('x-webhook-timestamp');

    if (!signature || !timestamp) {
      return new NextResponse('Missing signature headers', { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', CASHFREE_CLIENT_SECRET!)
      .update(timestamp + rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.error('Invalid webhook signature');
      return new NextResponse('Invalid signature', { status: 400 });
    }

    const { data } = parsed;
    const { order } = data || {};
    if (!order) {
      return new NextResponse('Invalid payload', { status: 400 });
    }

    const { order_id, order_status, payment_status } = order;



    // Only proceed if paid
    if (payment_status === 'SUCCESS' && order_status === 'PAID') {
      try {
        await processPaidOrder(order_id);
      } catch (e) {
        console.error('Webhook processing failed', e);
        return new NextResponse('Processing failure', { status: 500 });
      }
    } else if (payment_status === 'FAILED' || order_status === 'CANCELLED') {
      await db.collection('orders').doc(order_id).set(
        { status: 'failed', failedAt: new Date() },
        { merge: true }
      );
    }

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
