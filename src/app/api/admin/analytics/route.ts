import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Return mock analytics data
    const analyticsData = {
      overview: {
        totalEvents: 156,
        totalUsers: 2847,
        totalRevenue: 45290,
        avgEventAttendance: 78,
        growthMetrics: {
          eventsGrowth: 12.3,
          usersGrowth: 8.7,
          revenueGrowth: 15.2,
        },
      },
      requests: {
        thisMonth: 24,
        approved: 18,
        rejected: 4,
        pending: 2,
        approvalRate: 81.8,
        avgProcessingTime: 2.3,
      },
      events: {
        thisWeek: 12,
        upcoming: 34,
        completed: 122,
        cancelled: 8,
        totalTicketsSold: 3421,
      },
      engagement: {
        avgViews: 245,
        avgFavorites: 23,
        conversionRate: 12.4,
        bounceRate: 34.2,
        avgSessionDuration: 4.7,
      },
      topCategories: [
        { name: 'Technology', count: 42, percentage: 26.9 },
        { name: 'Business', count: 31, percentage: 19.9 },
        { name: 'Arts & Culture', count: 28, percentage: 17.9 },
        { name: 'Education', count: 25, percentage: 16.0 },
        { name: 'Sports', count: 18, percentage: 11.5 },
        { name: 'Other', count: 12, percentage: 7.7 },
      ],
      recentActivity: [
        {
          id: '1',
          type: 'event_created',
          message: 'Tech Innovation Summit 2025 was approved and published',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          severity: 'success',
        },
        {
          id: '2',
          type: 'user_registered',
          message: '15 new users registered in the last hour',
          timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
          severity: 'info',
        },
        {
          id: '3',
          type: 'ticket_sold',
          message: '87 tickets sold for Community Art Fair',
          timestamp: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
          severity: 'success',
        },
        {
          id: '4',
          type: 'request_approved',
          message: 'Business Workshop request approved after review',
          timestamp: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
          severity: 'success',
        },
      ],
    };

    return NextResponse.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics data' }, { status: 500 });
  }
}
