import { NextRequest, NextResponse } from 'next/server';
import { validateDynamicQr, redeemDynamicQr } from '@/lib/dynamic-qr-service';
import { requireOrganizerForEvent } from '@/lib/organizer-session';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = checkRateLimit(`dynamic-qr-redeem:${getClientIp(request)}`, 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, status: 'INVALID QR', message: 'Too many requests. Please slow down.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const { code, eventId, action = 'validate', staffInfo, currentDayNumber, currentDate } = await request.json();

    if (!code) {
      return NextResponse.json(
        { success: false, status: 'INVALID QR', message: 'QR Code is required' },
        { status: 400 }
      );
    }

    const authError = await requireOrganizerForEvent(request, eventId);
    if (authError) return authError;

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
