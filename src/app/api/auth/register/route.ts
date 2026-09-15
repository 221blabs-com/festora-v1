import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    return NextResponse.json({
      success: true,
      message: 'Registration endpoint ready',
      email: email || undefined,
    });
  } catch (error) {
    console.error('Registration route error:', error);
    return NextResponse.json({ success: false, error: 'Registration error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Auth registration endpoint' });
}
