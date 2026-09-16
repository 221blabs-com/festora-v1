import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { sendOrganizerCredentialsEmail } from '@/lib/resend-email';
import { requireSystemAdmin } from '@/lib/admin-session';

export async function POST(request: NextRequest) {
  try {
    const authError = requireSystemAdmin(request);
    if (authError) return authError;

    // Get all events
    const eventsSnapshot = await db.collection('events').get();
    const currentYear = new Date().getFullYear();

    const results: Array<{
      eventId: string;
      eventTitle: string;
      username: string;
      password: string;
      status: string;
    }> = [];

    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data();
      const eventId = eventDoc.id;

      // Generate credentials based on event slug/id
      const organizerUsername = eventId.toLowerCase();
      const organizerPassword = `${eventId.replace(/-/g, '')}${currentYear}`;

      // Check if organizer already exists for this event
      const existingOrganizer = await db.collection('organizers')
        .where('eventId', '==', eventId)
        .limit(1)
        .get();

      if (existingOrganizer.empty) {
        // Also check by username
        const existingByUsername = await db.collection('organizers')
          .where('username', '==', organizerUsername)
          .limit(1)
          .get();

        if (existingByUsername.empty) {
          // Create new organizer entry
          const organizerRef = db.collection('organizers').doc();
          await organizerRef.set({
            username: organizerUsername,
            password: organizerPassword,
            organizerName: eventData.organizer?.name || eventData.organizationName || eventData.title,
            email: eventData.organizer?.email || 'organizer@festora.com',
            eventId: eventId,
            eventTitle: eventData.title,
            verified: true,
            createdAt: new Date().toISOString(),
            createdBy: 'admin-backfill'
          });

          const targetEmail = eventData.organizer?.email;
          if (targetEmail && !targetEmail.includes('@festora.com')) {
            try {
              await sendOrganizerCredentialsEmail({
                to: targetEmail,
                organizerName: eventData.organizer?.name || eventData.title,
                username: organizerUsername,
                password: organizerPassword,
                eventTitle: eventData.title,
                eventId: eventId,
                status: 'created',
              });
            } catch (err) {
              console.error('[Resend] Failed to send email in create-organizers:', err);
            }
          }

          results.push({
            eventId,
            eventTitle: eventData.title,
            username: organizerUsername,
            password: organizerPassword,
            status: 'created'
          });
        } else {
          results.push({
            eventId,
            eventTitle: eventData.title,
            username: organizerUsername,
            password: organizerPassword,
            status: 'already exists (by username)'
          });
        }
      } else {
        const existingData = existingOrganizer.docs[0].data();
        results.push({
          eventId,
          eventTitle: eventData.title,
          username: existingData.username,
          password: existingData.password,
          status: 'already exists'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} events`,
      organizers: results
    });

  } catch (error) {
    console.error('Error creating organizers:', error);
    return NextResponse.json({
      error: 'Failed to create organizers',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
