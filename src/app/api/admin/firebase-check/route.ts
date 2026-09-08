import { NextResponse } from 'next/server';
import { getFirebaseAdminConfigDiagnostics } from '@/lib/firebase-admin-config';

export async function GET() {
  const diagnostics = getFirebaseAdminConfigDiagnostics();

  return NextResponse.json({
    status: diagnostics.configured ? 'ready' : 'unconfigured',
    ...diagnostics,
    timestamp: new Date().toISOString(),
  });
}
