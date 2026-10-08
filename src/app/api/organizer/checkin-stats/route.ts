import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import type { Event, EventDay } from '@/types/event';
import type { Ticket, DayTicketPass } from '@/types/firestore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ success: false, error: 'Event ID is required' }, { status: 400 });
    }

    const eventDoc = await db.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const eventData = eventDoc.data() as Event;

    // Fetch all confirmed tickets
    const ticketsSnap = await db.collection('tickets').where('eventId', '==', eventId).get();
    const tickets = ticketsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Ticket[];

    const totalRegistered = tickets.length;

    const daysStats: Array<{
      dayNumber: number;
      date: string;
      title?: string;
      registered: number;
      checkedIn: number;
      remaining: number;
    }> = [];

    if (eventData.isMultiDay && eventData.eventDays && eventData.eventDays.length > 1) {
      eventData.eventDays.forEach((day: EventDay) => {
        const checkedInForDay = tickets.filter(t => {
          if (!t.dayTickets || t.dayTickets.length === 0) {
            // Fallback for legacy single-ticket record
            return t.isCheckedIn || Boolean(t.checkedIn);
          }
          const dt = t.dayTickets.find((d: DayTicketPass) => d.dayNumber === day.dayNumber);
          return dt ? (dt.isCheckedIn || Boolean(dt.checkedIn)) : false;
        }).length;

        daysStats.push({
          dayNumber: day.dayNumber,
          date: day.date,
          title: day.title || `Day ${day.dayNumber}`,
          registered: totalRegistered,
          checkedIn: checkedInForDay,
          remaining: Math.max(0, totalRegistered - checkedInForDay)
        });
      });
    } else {
      // Single day event
      const checkedInCount = tickets.filter(t => t.isCheckedIn || Boolean(t.checkedIn)).length;
      daysStats.push({
        dayNumber: 1,
        date: eventData.startDate || (eventData as any).date || 'Event Day',
        title: 'Single Day Pass',
        registered: totalRegistered,
        checkedIn: checkedInCount,
        remaining: Math.max(0, totalRegistered - checkedInCount)
      });
    }

    return NextResponse.json({
      success: true,
      eventId,
      eventTitle: eventData.title,
      isMultiDay: Boolean(eventData.isMultiDay && eventData.eventDays && eventData.eventDays.length > 1),
      totalRegistered,
      days: daysStats
    });
  } catch (error: any) {
    console.error('Error fetching checkin stats:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
