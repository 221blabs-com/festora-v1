import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

/**
 * GET /api/admin/email-logs
 * Returns the most recent email log entries from Firestore.
 * Query params:
 *   limit  – max records to return (default 50)
 *   type   – filter by email type
 *   status – filter by status ('sent' | 'failed')
 */
export async function GET(request: NextRequest) {
  try {
    if (!db) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit') || '50', 10);
    const typeFilter = searchParams.get('type');
    const statusFilter = searchParams.get('status');

    let query: FirebaseFirestore.Query = db
      .collection('email_logs')
      .orderBy('sentAt', 'desc')
      .limit(Math.min(limitParam, 200));

    const snapshot = await query.get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Apply optional filters in-memory (to avoid composite index requirements)
    let filtered = logs;
    if (typeFilter) filtered = filtered.filter((l: any) => l.type === typeFilter);
    if (statusFilter) filtered = filtered.filter((l: any) => l.status === statusFilter);

    return NextResponse.json({
      success: true,
      total: filtered.length,
      logs: filtered,
    });
  } catch (error) {
    console.error('Error fetching email logs:', error);
    return NextResponse.json({
      error: 'Failed to fetch email logs',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}