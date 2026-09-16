import crypto from 'crypto';

/**
 * Constant-time string comparison for signatures/secrets, so verification
 * doesn't leak timing information about how many leading bytes matched.
 * Safe against differing lengths (a plain crypto.timingSafeEqual throws
 * if the two buffers aren't the same length).
 */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
