export function normalizeFirebasePrivateKey(privateKey?: string): string | undefined {
  if (!privateKey) {
    return undefined;
  }

  let normalized = privateKey.trim();

  // Strip wrapping double or single quotes if present (common when pasting in Vercel/env)
  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  normalized = normalized.replace(/\r/g, '').replace(/\\n/g, '\n');

  if (!normalized.includes('\n') && normalized.includes('-----BEGIN PRIVATE KEY-----')) {
    normalized = normalized
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }

  return normalized;
}

export function hasFirebaseServiceAccountConfig(env: Record<string, string | undefined> = process.env) {
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  let projectId = (env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)?.trim();

  if (!projectId && clientEmail && clientEmail.includes('@') && clientEmail.includes('.iam.gserviceaccount.com')) {
    projectId = clientEmail.split('@')[1].split('.')[0];
  }

  const privateKey = normalizeFirebasePrivateKey(env.FIREBASE_PRIVATE_KEY);

  const isValidPrivateKey = Boolean(
    privateKey &&
    privateKey.includes('-----BEGIN') &&
    !privateKey.includes('mock-private-key')
  );

  return Boolean(projectId && clientEmail && isValidPrivateKey);
}
