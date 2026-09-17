// Simple in-memory rate limiter for Next.js App Router
const rateLimitMap = new Map<string, number[]>();

// Clean up old entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const valid = timestamps.filter((t) => t > now - 60000);
      if (valid.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, valid);
      }
    }
  }, 60000);
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  headers: Record<string, string>;
}

/**
 * Check rate limit for a given token (usually IP address).
 * @param token - Unique identifier (IP, user ID, etc.)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 */
export function checkRateLimit(
  token: string,
  limit: number,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = rateLimitMap.get(token) || [];
  const validTimestamps = timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, limit - validTimestamps.length);
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil((windowStart + windowMs) / 1000)),
  };

  if (validTimestamps.length >= limit) {
    return { success: false, limit, remaining: 0, headers };
  }

  validTimestamps.push(now);
  rateLimitMap.set(token, validTimestamps);

  return { success: true, limit, remaining: remaining - 1, headers };
}

/**
 * Get the client IP from a Next.js request.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}
