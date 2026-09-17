import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import axios from 'axios';

const CASHFREE_CLIENT_ID = process.env.CASHFREE_CLIENT_ID;
const CASHFREE_CLIENT_SECRET = process.env.CASHFREE_CLIENT_SECRET;
const CASHFREE_BASE_URL = "https://api.cashfree.com/pg";

export async function POST(request: NextRequest) {
  // Verify authentication
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const idToken = authHeader.split('Bearer ')[1];
    await auth?.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get order details
    const orderDoc = await db.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;

    // Check if order is already processed
    if (orderData.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Order already processed',
        alreadyProcessed: true
      });
    }

    // Verify payment status with Cashfree
    if (orderData.paymentGatewayId) {
      try {
        const paymentStatusResponse = await axios.get(
          `${CASHFREE_BASE_URL}/orders/${orderData.paymentGatewayId}`,
          {
            headers: {
              'X-Client-Id': CASHFREE_CLIENT_ID,
              'X-Client-Secret': CASHFREE_CLIENT_SECRET,
              'x-api-version': '2023-08-01'
            }
          }
        );

        const paymentStatus = paymentStatusResponse.data;

        if (paymentStatus.order_status !== 'PAID') {
          return NextResponse.json({
            error: 'Payment not completed',
            message: `Order status: ${paymentStatus.order_status}. Cannot process unpaid order.`,
            paymentStatus: paymentStatus.order_status
          }, { status: 400 });
        }

      } catch {
        console.error('Error verifying payment with Cashfree');
        return NextResponse.json({
          error: 'Could not verify payment status',
          message: 'Unable to confirm payment completion with Cashfree'
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        error: 'No payment gateway ID found',
        message: 'Cannot verify payment status for this order'
      }, { status: 400 });
    }

    // Process order idempotently
    try {
      const { processPaidOrder } = await import('@/lib/order-processing');
      const result = await processPaidOrder(orderId);
      return NextResponse.json({ success: true, orderId, ...result });
    } catch (procErr: unknown) {
      const error = procErr as Error;
      console.error('Order processing failed:', error);
      return NextResponse.json({ error: 'Processing failed', details: error.message }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Manual processing error:', error);
    return NextResponse.json({
      error: 'Failed to process order',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
