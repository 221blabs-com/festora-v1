import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

// Define the type for event request data
interface EventRequest {
  id: string;
  submittedAt?: string | number;
  status?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    let query = db.collection('event_requests') as FirebaseFirestore.Query;

    // If filtering by specific status, don't use orderBy to avoid composite index requirement
    if (status !== 'all') {
      query = query.where('status', '==', status);
      // Don't order when filtering by status to avoid composite index requirement
    } else {
      // Only order when getting all records
      query = query.orderBy('submittedAt', 'desc');
    }

    const snapshot = await query.get();

    let requests: EventRequest[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // If we couldn't order in Firebase (due to status filter), sort in JavaScript
    if (status !== 'all') {
      requests = requests.sort((a: EventRequest, b: EventRequest) => {
        const dateA = new Date((a.submittedAt as string | number) || 0).getTime();
        const dateB = new Date((b.submittedAt as string | number) || 0).getTime();
        return dateB - dateA; // Newest first
      });
    }



    return NextResponse.json({
      success: true,
      requests,
      count: requests.length
    });

  } catch (error) {
    console.error('Error fetching event requests:', error);
    // Return empty array instead of error to prevent frontend crash
    return NextResponse.json({
      success: true,
      requests: [],
      count: 0
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { requestId, status, adminNotes } = await request.json();

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Request ID and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved or rejected' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (adminNotes) {
      updateData.adminNotes = adminNotes;
    }

    await db.collection('event_requests').doc(requestId).update(updateData);



    return NextResponse.json({
      success: true,
      message: `Request ${status} successfully`
    });

  } catch (error) {
    console.error('Error updating event request:', error);
    return NextResponse.json(
      { error: 'Failed to update event request' },
      { status: 500 }
    );
  }
}
