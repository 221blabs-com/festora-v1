import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase-admin';
import axios from 'axios';

const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE_URL = 'https://api.cashfree.com/pg';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth) {
      return NextResponse.json({ error: 'Authentication service unavailable' }, { status: 503 });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decoded = await auth.verifyIdToken(idToken);

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'orderId required' }, { status: 400 });
    }

    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderSnap.data() as Record<string, unknown>;

    if (orderData.userId !== decoded.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If already completed, process idempotently
    if (orderData.status === 'completed') {
      const { processPaidOrder } = await import('@/lib/order-processing');
      const result = await processPaidOrder(orderId);
      return NextResponse.json({ success: true, status: 'completed', orderId, ...result });
    }

    // Verify with Razorpay if applicable
    if (orderData.paymentGateway === 'razorpay' || orderData.razorpayOrderId) {
      const razorpayId = (orderData.razorpayOrderId || orderData.paymentGatewayId) as string;
      const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '';
      const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

      if (RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET && razorpayId) {
        try {
          const Razorpay = (await import('razorpay')).default;
          const razorpay = new Razorpay({
            key_id: RAZORPAY_KEY_ID,
            key_secret: RAZORPAY_KEY_SECRET
          });

          const rzpOrder = await razorpay.orders.fetch(razorpayId);
          if (rzpOrder.status === 'paid') {
            await orderRef.set({ status: 'completed', paymentStatus: 'PAID', paidAt: new Date() }, { merge: true });
            const { processPaidOrder } = await import('@/lib/order-processing');
            const result = await processPaidOrder(orderId);
            return NextResponse.json({ success: true, status: 'completed', orderId, ...result });
          } else {
            return NextResponse.json({ success: true, status: 'pending', gatewayStatus: rzpOrder.status });
          }
        } catch (e) {
          console.error('Razorpay status fetch error:', e);
          return NextResponse.json({ error: 'Failed to verify payment with Razorpay' }, { status: 502 });
        }
      }
    }

    if (!orderData.paymentGatewayId) {
      return NextResponse.json({ error: 'Missing payment gateway id on order' }, { status: 400 });
    }

    // Fallback: Verify with Cashfree
    let gatewayStatus: Record<string, unknown>;
    try {
      const gatewayResp = await axios.get(`${CASHFREE_BASE_URL}/orders/${orderData.paymentGatewayId}`, {
        headers: {
          'X-Client-Id': CASHFREE_CLIENT_ID,
          'X-Client-Secret': CASHFREE_CLIENT_SECRET,
          'x-api-version': '2023-08-01'
        }
      });
      gatewayStatus = gatewayResp.data;
    } catch (e: unknown) {
      const axiosError = e as { response?: { data?: unknown }; message?: string };
      console.error('Cashfree status fetch error', axiosError.response?.data || axiosError.message);
      return NextResponse.json({ error: 'Failed to verify payment with gateway' }, { status: 502 });
    }

    const paid = gatewayStatus.order_status === 'PAID';
    if (!paid) {
      return NextResponse.json({ success: true, status: 'pending', gatewayStatus: gatewayStatus.order_status });
    }

    // Process idempotently
    const { processPaidOrder } = await import('@/lib/order-processing');
    const result = await processPaidOrder(orderId);

    return NextResponse.json({
      success: true,
      status: 'completed',
      orderId,
      gatewayStatus: gatewayStatus.order_status,
      ...result
    });

  } catch (err: unknown) {
    console.error('Confirm error', err);
    const error = err as Error;
    return NextResponse.json({ error: 'Internal error', details: error.message }, { status: 500 });
  }
}
