import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminConfigDiagnostics } from '@/lib/firebase-admin-config';
import { requireSystemAdmin } from '@/lib/admin-session';

export async function GET(request: NextRequest) {
  const authError = requireSystemAdmin(request);
  if (authError) return authError;
  const diagnostics = getFirebaseAdminConfigDiagnostics();

  return NextResponse.json({
    status: diagnostics.configured ? 'ready' : 'unconfigured',
    ...diagnostics,
    timestamp: new Date().toISOString(),
  });
}
