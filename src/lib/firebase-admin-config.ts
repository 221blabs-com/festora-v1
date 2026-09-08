export interface FirebaseAdminResolvedCredentials {
  projectId?: string;
  clientEmail?: string;
  privateKey?: string;
}

export function normalizeFirebasePrivateKey(privateKey?: string): string | undefined {
  if (!privateKey) {
    return undefined;
  }

  let normalized = privateKey.trim();

  // Strip wrapping quotes (single, double, or escaped quotes)
  while (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'")) ||
    (normalized.startsWith('\\"') && normalized.endsWith('\\"')) ||
    (normalized.startsWith("\\'") && normalized.endsWith("\\'"))
  ) {
    if (normalized.startsWith('\\"') || normalized.startsWith("\\'")) {
      normalized = normalized.slice(2, -2).trim();
    } else {
      normalized = normalized.slice(1, -1).trim();
    }
  }

  // Handle literal escaped newlines (\n, \\n, or multiple backslashes)
  normalized = normalized.replace(/\r/g, '').replace(/\\+n/g, '\n');

  if (!normalized.includes('\n') && normalized.includes('-----BEGIN PRIVATE KEY-----')) {
    normalized = normalized
      .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
      .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
  }

  return normalized;
}

export function extractCredentialsFromJson(jsonString?: string): FirebaseAdminResolvedCredentials | null {
  if (!jsonString) return null;
  const trimmed = jsonString.trim();

  // Check if string is raw JSON or base64-encoded JSON
  let candidateJson = trimmed;
  if (!candidateJson.startsWith('{')) {
    try {
      const decoded = Buffer.from(candidateJson, 'base64').toString('utf8').trim();
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        candidateJson = decoded;
      }
    } catch {
      // not base64
    }
  }

  if (candidateJson.startsWith('{') && candidateJson.endsWith('}')) {
    try {
      const parsed = JSON.parse(candidateJson);
      if (parsed.private_key || parsed.client_email) {
        return {
          projectId: parsed.project_id,
          clientEmail: parsed.client_email,
          privateKey: normalizeFirebasePrivateKey(parsed.private_key),
        };
      }
    } catch {
      // JSON parse error
    }
  }

  return null;
}

export function getFirebaseAdminCredentials(
  env: Record<string, string | undefined> = process.env
): FirebaseAdminResolvedCredentials {
  // 1. Check if a dedicated JSON credential env var is provided or pasted into private key
  const jsonCandidates = [
    env.FIREBASE_SERVICE_ACCOUNT_KEY,
    env.FIREBASE_SERVICE_ACCOUNT,
    env.FIREBASE_CREDENTIALS,
    env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
    env.FIREBASE_PRIVATE_KEY, // in case full json was pasted directly into private key variable
  ];

  for (const candidate of jsonCandidates) {
    const extracted = extractCredentialsFromJson(candidate);
    if (extracted && extracted.privateKey && extracted.clientEmail) {
      return {
        projectId:
          extracted.projectId ||
          env.FIREBASE_PROJECT_ID ||
          env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: extracted.clientEmail,
        privateKey: extracted.privateKey,
      };
    }
  }

  // 2. Read individual environment variables
  const clientEmail = (
    env.FIREBASE_CLIENT_EMAIL ||
    env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    env.CLIENT_EMAIL
  )?.trim();

  let projectId = (
    env.FIREBASE_PROJECT_ID ||
    env.FIREBASE_ADMIN_PROJECT_ID ||
    env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  )?.trim();

  if (!projectId && clientEmail && clientEmail.includes('@') && clientEmail.includes('.iam.gserviceaccount.com')) {
    projectId = clientEmail.split('@')[1].split('.')[0];
  }

  const rawKey =
    env.FIREBASE_PRIVATE_KEY ||
    env.FIREBASE_ADMIN_PRIVATE_KEY ||
    env.PRIVATE_KEY;

  let privateKey = normalizeFirebasePrivateKey(rawKey);

  // Check if private key was base64 encoded
  if (rawKey && (!privateKey || !privateKey.includes('-----BEGIN'))) {
    try {
      const decoded = Buffer.from(rawKey.trim(), 'base64').toString('utf8');
      if (decoded.includes('-----BEGIN')) {
        privateKey = normalizeFirebasePrivateKey(decoded);
      }
    } catch {
      // not base64
    }
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function hasFirebaseServiceAccountConfig(
  env: Record<string, string | undefined> = process.env
): boolean {
  const creds = getFirebaseAdminCredentials(env);
  const isValidPrivateKey = Boolean(
    creds.privateKey &&
    creds.privateKey.includes('-----BEGIN') &&
    !creds.privateKey.includes('mock-private-key')
  );

  return Boolean(creds.projectId && creds.clientEmail && isValidPrivateKey);
}

export function getFirebaseAdminConfigDiagnostics(
  env: Record<string, string | undefined> = process.env
) {
  const creds = getFirebaseAdminCredentials(env);
  const hasProj = Boolean(creds.projectId);
  const hasEmail = Boolean(creds.clientEmail);
  const hasKey = Boolean(creds.privateKey);
  const keyValid = Boolean(
    creds.privateKey &&
    creds.privateKey.includes('-----BEGIN') &&
    !creds.privateKey.includes('mock-private-key')
  );

  const missing: string[] = [];
  if (!hasProj) missing.push('FIREBASE_PROJECT_ID');
  if (!hasEmail) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!hasKey || !keyValid) missing.push('FIREBASE_PRIVATE_KEY');

  return {
    configured: Boolean(hasProj && hasEmail && keyValid),
    missing,
    hasProjectId: hasProj,
    projectId: creds.projectId || null,
    hasClientEmail: hasEmail,
    clientEmailPrefix: creds.clientEmail ? creds.clientEmail.split('@')[0] : null,
    clientEmailDomain: creds.clientEmail ? creds.clientEmail.split('@')[1] : null,
    hasPrivateKey: hasKey,
    privateKeyLength: creds.privateKey ? creds.privateKey.length : 0,
    privateKeyValid: keyValid,
  };
}
