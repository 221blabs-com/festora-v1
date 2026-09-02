import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`admin-login:${ip}`, 5);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Fetch admin user from Firebase
    const adminDoc = await db.collection('admin_users').doc(username).get();

    if (!adminDoc.exists) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const adminData = adminDoc.data();

    if (!adminData || !adminData.verified) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password with bcrypt (with backward-compatible auto-migration)
    const storedPassword = adminData.password;
    let isPasswordValid = false;

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      // Password is already hashed
      isPasswordValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Legacy plain text password — compare directly, then auto-migrate
      isPasswordValid = storedPassword === password;
      if (isPasswordValid) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await adminDoc.ref.update({ password: hashedPassword });
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Return admin info (excluding password)
    return NextResponse.json({
      success: true,
      admin: {
        username: adminDoc.id,
        adminName: adminData.email?.split('@')[0] || 'Admin',
        email: adminData.email,
        verified: adminData.verified,
        role: 'admin'
      }
    });

  } catch (error) {
    console.error('Admin authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

