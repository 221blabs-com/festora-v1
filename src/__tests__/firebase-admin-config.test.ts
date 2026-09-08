import {
  hasFirebaseServiceAccountConfig,
  getFirebaseAdminCredentials,
  getFirebaseAdminConfigDiagnostics,
} from '../lib/firebase-admin-config';

describe('Firebase admin config guard', () => {
  it('returns false when the service account values are incomplete', () => {
    expect(
      hasFirebaseServiceAccountConfig({
        FIREBASE_PROJECT_ID: 'festora-472506',
        FIREBASE_CLIENT_EMAIL: '',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
      })
    ).toBe(false);
  });

  it('returns true when the service account values are all present', () => {
    expect(
      hasFirebaseServiceAccountConfig({
        FIREBASE_PROJECT_ID: 'festora-472506',
        FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@festora-472506.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
      })
    ).toBe(true);
  });

  it('handles wrapping quotes and falls back to client email project id', () => {
    expect(
      hasFirebaseServiceAccountConfig({
        FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@heartfund-cf797.iam.gserviceaccount.com',
        FIREBASE_PRIVATE_KEY: '"-----BEGIN PRIVATE KEY-----\\nabc\\n-----END PRIVATE KEY-----\\n"',
      })
    ).toBe(true);
  });

  it('supports full service account JSON in FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PRIVATE_KEY', () => {
    const serviceAccountJson = JSON.stringify({
      type: 'service_account',
      project_id: 'heartfund-cf797',
      client_email: 'firebase-adminsdk-fbsvc@heartfund-cf797.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgk...\n-----END PRIVATE KEY-----\n',
    });

    expect(
      hasFirebaseServiceAccountConfig({
        FIREBASE_PRIVATE_KEY: serviceAccountJson,
      })
    ).toBe(true);

    const creds = getFirebaseAdminCredentials({
      FIREBASE_SERVICE_ACCOUNT_KEY: serviceAccountJson,
    });
    expect(creds.projectId).toBe('heartfund-cf797');
    expect(creds.clientEmail).toBe('firebase-adminsdk-fbsvc@heartfund-cf797.iam.gserviceaccount.com');
    expect(creds.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
  });

  it('provides detailed diagnostic report', () => {
    const diag = getFirebaseAdminConfigDiagnostics({
      FIREBASE_CLIENT_EMAIL: 'admin@heartfund-cf797.iam.gserviceaccount.com',
    });

    expect(diag.configured).toBe(false);
    expect(diag.hasClientEmail).toBe(true);
    expect(diag.hasPrivateKey).toBe(false);
    expect(diag.missing).toContain('FIREBASE_PRIVATE_KEY');
  });
});
