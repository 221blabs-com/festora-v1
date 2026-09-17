import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sendEnterpriseInquiryEmail } from '@/lib/resend-email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      organization,
      role,
      attendees,
      eventType,
      timeline,
      message
    } = body;

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ success: false, error: 'A valid email address is required' }, { status: 400 });
    }

    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return NextResponse.json({ success: false, error: 'Contact phone number is required' }, { status: 400 });
    }

    if (!organization || typeof organization !== 'string' || !organization.trim()) {
      return NextResponse.json({ success: false, error: 'Organization or College name is required' }, { status: 400 });
    }

    // Generate reference inquiry ID
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const inquiryId = `ENT-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    const timestamp = new Date().toISOString();

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 1. Persist to Firestore for record-keeping and redundancy
    try {
      if (db) {
        await db.collection('enterpriseInquiries').add({
          inquiryId,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          organization: organization.trim(),
          role: (role || '').trim(),
          attendees: (attendees || '').trim(),
          eventType: (eventType || '').trim(),
          timeline: (timeline || '').trim(),
          message: (message || '').trim(),
          status: 'new',
          source: 'enterprise_lets_talk',
          createdAt: timestamp,
          clientIp,
          userAgent
        });
      }
    } catch (dbErr) {
      console.error('[Enterprise Inquiry] Firestore storage error:', dbErr);
      // Continue so email notification is still dispatched
    }

    // 2. Dispatch email to festora@221blabs.com and confirmation receipt to requester
    const { adminResult, customerResult } = await sendEnterpriseInquiryEmail({
      inquiryId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      organization: organization.trim(),
      role: (role || '').trim() || 'Organizer / Decision Maker',
      attendees: (attendees || '').trim() || 'Custom Scale',
      eventType: (eventType || '').trim() || 'College Fest / Conference',
      timeline: (timeline || '').trim() || 'Upcoming',
      message: (message || '').trim() || 'Looking forward to learning more about Festora Enterprise.',
      submittedAt: new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'full',
        timeStyle: 'medium',
      }),
    });

    console.log(`[Enterprise Inquiry] Inquiry #${inquiryId} submitted. Admin email sent: ${adminResult.success}, Customer email sent: ${customerResult.success}`);

    return NextResponse.json({
      success: true,
      inquiryId,
      message: 'Your enterprise request has been sent successfully. Our team will contact you within 24 hours.',
    });

  } catch (error: any) {
    console.error('[Enterprise Inquiry] API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'An unexpected error occurred while submitting your request.'
      },
      { status: 500 }
    );
  }
}
