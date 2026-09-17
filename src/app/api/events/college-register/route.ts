import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendEmailWithQRAttachment } from '@/lib/email';
import { cache } from '@/lib/cache';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      collegeName, 
      coordinatorName, 
      coordinatorMobile, 
      coordinatorEmail, 
      events 
    } = data;

    if (!collegeName || !coordinatorName || !coordinatorMobile || !coordinatorEmail || !events || events.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Try to get userId if logged in
    let userId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        if (auth) {
          const decodedToken = await auth.verifyIdToken(idToken);
          userId = decodedToken.uid;
        }
      } catch (err) {
        console.warn('Could not verify auth token:', err);
      }
    }

    // Generate a unique registration ID
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const registrationId = `HCISQ-2026-${randomStr}`;
    
    // Create Firestore document
    const docData = {
      id: registrationId,
      eventId: 'hyderabad-city-inter-college-sports-quiz-competitions-2026',
      userId,
      collegeName,
      coordinatorName,
      coordinatorMobile,
      coordinatorEmail,
      events,
      createdAt: new Date(),
    };

    await db.collection('college_registrations').doc(registrationId).set(docData);

    // If logged in, also create a ticket document for the dashboard
    if (userId) {
      const ticketDoc = {
        ticketId: registrationId,
        orderId: registrationId, // Mock order ID for the dashboard
        userId: userId,
        eventId: 'hyderabad-city-inter-college-sports-quiz-competitions-2026',
        userEmail: coordinatorEmail,
        ticketNumber: 1,
        totalTickets: 1,
        qrCodeData: registrationId,
        isCheckedIn: false,
        createdAt: new Date(),
      };
      await db.collection('tickets').doc(registrationId).set(ticketDoc);
    }
    
    // Increment ticketsSold on the event document (using number of sports registered)
    try {
      await db.collection('events').doc('hyderabad-city-inter-college-sports-quiz-competitions-2026').update({
        ticketsSold: FieldValue.increment(events.length)
      });
    } catch (err) {
      console.warn('Failed to increment ticketsSold on event', err);
    }

    // Invalidate server cache so dashboard immediately reflects new registration & counts
    try {
      cache.invalidatePrefix('participants:');
      cache.invalidatePrefix('organizer_events:');
    } catch (err) {
      console.warn('Cache invalidation error', err);
    }

    // Generate QR Code buffer
    const qrCodeBuffer = await QRCode.toBuffer(registrationId, {
      errorCorrectionLevel: 'M',
      type: 'png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 300
    });

    // Create Email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
          .qr-container { text-align: center; margin: 20px 0; }
          .event-list { margin-top: 20px; }
          .event-item { background: #fff; padding: 15px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Registration Successful!</h2>
          </div>
          <p>Dear ${coordinatorName},</p>
          <p>Thank you for registering <strong>${collegeName}</strong> for the Hyderabad City Inter-College Sports & Quiz Competitions 2026.</p>
          
          <div class="content">
            <h3>Registration ID: ${registrationId}</h3>
            
            <div class="qr-container">
              <p>Please present this QR code at the event for quick check-in.</p>
              <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
            </div>

            <div class="event-list">
              <h4>Registered Events (${events.length}):</h4>
              ${events.map((e: any) => `
                <div class="event-item">
                  <strong>${e.sportName} (${e.category})</strong><br/>
                  Team/Participant: ${e.teamName}<br/>
                  Captain: ${e.captainName}
                </div>
              `).join('')}
            </div>
          </div>
          
          <p>If you have any questions, please contact the organizing committee.</p>
          <p>Best regards,<br/>Festora Team</p>
        </div>
      </body>
      </html>
    `;

    // Send Email
    try {
      await sendEmailWithQRAttachment({
        to: coordinatorEmail,
        subject: `Registration Confirmed: ${collegeName} - Inter-College Sports & Quiz 2026`,
        html: emailHtml,
        qrCodeBuffer,
        ticketCode: registrationId,
      });
    } catch (emailError) {
      console.warn('Failed to send confirmation email, but registration was saved:', emailError);
    }

    return NextResponse.json({ 
      success: true, 
      registrationId,
      message: 'Registration successful' 
    });

  } catch (error) {
    console.error('College Registration Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
