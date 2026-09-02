export function normalizeFirebasePrivateKey(privateKey?: string): string | undefined {
  if (!privateKey) {
    return undefined;
  }

  const normalized = privateKey.replace(/\r/g, '').replace(/\\n/g, '\n');

  if (!normalized.includes('\n') && normalized.includes('-----BEGIN PRIVATE KEY-----')) {
    return normalized
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }

  return normalized;
}

export function hasFirebaseServiceAccountConfig(env: Record<string, string | undefined> = process.env) {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizeFirebasePrivateKey(env.FIREBASE_PRIVATE_KEY);

  return Boolean(projectId && clientEmail && privateKey);
}
