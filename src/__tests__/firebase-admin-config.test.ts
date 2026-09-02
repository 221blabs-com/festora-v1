import { hasFirebaseServiceAccountConfig } from '../lib/firebase-admin-config';

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
});
