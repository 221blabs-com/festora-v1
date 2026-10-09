import { NextRequest, NextResponse } from 'next/server';
import { validateDynamicQr, redeemDynamicQr } from '@/lib/dynamic-qr-service';

export async function POST(request: NextRequest) {
  try {
    const { code, eventId, action = 'validate', staffInfo, currentDayNumber, currentDate } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, status: 'INVALID QR', message: 'QR Code is required' },
        { status: 400 }
      );
    }

    if (action === 'redeem') {
      const result = await redeemDynamicQr(code, eventId, staffInfo, currentDayNumber, currentDate);
      return NextResponse.json(result, { status: 200 });
    }

    // Default action: validate
    const result = await validateDynamicQr(code, eventId, currentDayNumber, currentDate);
    return NextResponse.json({
      success: result.valid,
      status: result.status,
      message: result.message,
      pass: result.pass
    }, { status: 200 });

  } catch (error: any) {
    console.error('Dynamic QR verification error:', error);
    return NextResponse.json(
      { success: false, status: 'INVALID QR', message: error?.message || 'Server error during QR processing' },
      { status: 500 }
    );
  }
}
