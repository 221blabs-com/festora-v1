import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import bcrypt from 'bcryptjs';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 login attempts per minute per IP
    const ip = getClientIp(request);
    const rateLimitResult = checkRateLimit(`organizer-login:${ip}`, 10);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again later.' },
        { status: 429, headers: rateLimitResult.headers }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password are required'
      }, { status: 400 });
    }

    if (!db) {
      console.error('Database connection not initialized');
      return NextResponse.json({
        success: false,
        error: 'Database service unavailable'
      }, { status: 503 });
    }

    // Query the organizers collection to find matching username
    const organizersSnapshot = await db.collection('organizers')
      .where('username', '==', username.trim())
      .limit(1)
      .get();

    if (organizersSnapshot.empty) {
      return NextResponse.json({
        success: false,
        error: 'Invalid username or password'
      }, { status: 401 });
    }

    const organizerDoc = organizersSnapshot.docs[0];
    const organizerData = organizerDoc.data();

    // Check if the organizer is verified
    if (!organizerData.verified) {
      return NextResponse.json({
        success: false,
        error: 'Organizer account not verified. Please contact support.'
      }, { status: 403 });
    }

    // Verify password with bcrypt
    const storedPassword = organizerData.password;
    let isPasswordValid = false;

    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      // Password is already hashed — compare with bcrypt
      isPasswordValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Legacy plain text password — compare directly, then auto-migrate to hashed
      isPasswordValid = storedPassword === password;
      if (isPasswordValid) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await organizerDoc.ref.update({ password: hashedPassword });
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Invalid username or password'
      }, { status: 401 });
    }

    // Authentication successful
    return NextResponse.json({
      success: true,
      organizerName: organizerData.organizerName,
      username: organizerData.username,
      email: organizerData.email,
      organization: organizerData.organizerName,
      verified: organizerData.verified,
      createdAt: organizerData.createdAt
    });

  } catch (error: unknown) {
    console.error('Error during organizer login:', error);
    return NextResponse.json({
      success: false,
      error: 'Authentication failed. Please try again.',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

