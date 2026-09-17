import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { createSlug } from '@/lib/slug-utils';
import { sendOrganizerCredentialsEmail } from '@/lib/resend-email';
import type { Event } from '@/types/event';

export async function POST(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const eventData: Partial<Event> & { existingOrganizerId?: string } = await request.json();

    // Validate required fields
    if (!eventData.title) {
      return NextResponse.json({ error: 'Event title is required' }, { status: 400 });
    }
    if (!eventData.description) {
      return NextResponse.json({ error: 'Event description is required' }, { status: 400 });
    }
    if (!eventData.startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }
    if (!eventData.endDate) {
      return NextResponse.json({ error: 'End date is required' }, { status: 400 });
    }
    if (!eventData.venue) {
      return NextResponse.json({ error: 'Venue is required' }, { status: 400 });
    }
    if (!eventData.organizer?.name || !eventData.organizer?.email) {
      return NextResponse.json({ error: 'Organizer name and email are required' }, { status: 400 });
    }

    // Generate clean slug from title
    const baseSlug = createSlug(eventData.title);

    // Check if exact slug already exists
    const existingDoc = await db.collection('events').doc(baseSlug).get();

    let finalSlug = baseSlug;

    if (existingDoc.exists) {
      let counter = 2;
      while (true) {
        const testSlug = `${baseSlug}-${counter}`;
        const testDoc = await db.collection('events').doc(testSlug).get();
        if (!testDoc.exists) {
          finalSlug = testSlug;
          break;
        }
        counter++;
        if (counter > 100) {
          return NextResponse.json({ error: 'Could not generate unique slug.' }, { status: 400 });
        }
      }
    }

    const eventRef = db.collection('events').doc(finalSlug);
    const now = new Date().toISOString();

    const fullEvent: Event = {
      id: finalSlug,
      slug: finalSlug,
      title: eventData.title,
      description: eventData.description,
      shortDescription: eventData.shortDescription || '',
      image: eventData.image || '',
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      dateTime: {
        startDate: eventData.startDate,
        endDate: eventData.endDate
      },
      venue: eventData.venue,
      venueType: eventData.venueType || 'physical',
      location: eventData.location || { address: '', city: '', state: '', country: '' },
      virtualLink: eventData.virtualLink,
      price: eventData.price || 0,
      originalPrice: eventData.originalPrice || eventData.price || 0,
      ticketPrice: eventData.price || 0,
      isPaid: (eventData.price || 0) > 0,
      currency: eventData.currency || 'USD',
      category: eventData.category || 'Other',
      categories: eventData.categories || [],
      tags: eventData.tags || [],
      badges: eventData.badges || [],
      organizer: {
        id: eventData.existingOrganizerId || eventData.organizer?.id || `organizer_${eventRef.id}`,
        name: eventData.organizer.name,
        email: eventData.organizer.email,
        avatar: eventData.organizer?.avatar,
        verified: true
      },
      organizationName: eventData.organizationName,
      organizationDescription: eventData.organizationDescription,
      organizerLinks: eventData.organizerLinks,
      capacity: eventData.capacity,
      totalTickets: eventData.capacity,
      registeredCount: 0,
      ticketsSold: 0,
      isTeamEvent: eventData.isTeamEvent || false,
      teamSettings: eventData.teamSettings,
      agenda: eventData.agenda || [],
      requirements: eventData.requirements || [],
      status: 'published',
      approvalStatus: 'approved',
      isPublished: true,
      featured: eventData.featured || false,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system-admin'
    };

    await eventRef.set(fullEvent);

    if (eventData.existingOrganizerId) {
      // Don't create a new organizer, just use the existing one
      (fullEvent as any).organizerId = eventData.existingOrganizerId;
      await eventRef.update({ organizerId: eventData.existingOrganizerId });
      
      return NextResponse.json({
        success: true,
        message: 'Event created successfully',
        id: finalSlug,
        slug: finalSlug,
        event: fullEvent
      });
    } else {
      // Create organizer entry
      const currentYear = new Date().getFullYear();
      const organizerUsername = finalSlug.toLowerCase();
      const organizerPassword = `${finalSlug.replace(/-/g, '')}${currentYear}`;

      const existingOrganizer = await db.collection('organizers')
        .where('username', '==', organizerUsername)
        .limit(1)
        .get();

      if (existingOrganizer.empty) {
        const organizerRef = db.collection('organizers').doc();
        await organizerRef.set({
          username: organizerUsername,
          password: organizerPassword,
          organizerName: eventData.organizer.name || eventData.title,
          email: eventData.organizer.email,
          eventId: finalSlug,
          eventTitle: eventData.title,
          verified: true,
          createdAt: now,
          createdBy: 'system-admin'
        });
      }

      // Send email containing organizer ID and password via Resend
      if (eventData.organizer?.email) {
        try {
          await sendOrganizerCredentialsEmail({
            to: eventData.organizer.email,
            organizerName: eventData.organizer.name || eventData.title,
            username: organizerUsername,
            password: organizerPassword,
            eventTitle: eventData.title,
            eventId: finalSlug,
            status: 'created',
          });
        } catch (emailErr) {
          console.error('[Resend] Error sending organizer credentials email:', emailErr);
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Event created successfully',
        id: finalSlug,
        slug: finalSlug,
        event: fullEvent,
        organizerCredentials: {
          username: organizerUsername,
          password: organizerPassword,
          note: 'Use these credentials to access the organizer dashboard'
        }
      });
    }

  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
