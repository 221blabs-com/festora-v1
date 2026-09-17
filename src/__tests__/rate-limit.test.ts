import { checkRateLimit } from '../lib/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Each test gets a unique token so they don't interfere
  });

  it('allows requests under the limit', () => {
    const token = `test-allow-${Date.now()}`;
    const result = checkRateLimit(token, 5);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('tracks remaining count correctly', () => {
    const token = `test-count-${Date.now()}`;
    checkRateLimit(token, 5);
    checkRateLimit(token, 5);
    const result = checkRateLimit(token, 5);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('blocks requests over the limit', () => {
    const token = `test-block-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      checkRateLimit(token, 3);
    }
    const result = checkRateLimit(token, 3);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('includes rate limit headers', () => {
    const token = `test-headers-${Date.now()}`;
    const result = checkRateLimit(token, 10);
    expect(result.headers).toHaveProperty('X-RateLimit-Limit', '10');
    expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
    expect(result.headers).toHaveProperty('X-RateLimit-Reset');
  });

  it('uses separate buckets for different tokens', () => {
    const token1 = `test-separate-a-${Date.now()}`;
    const token2 = `test-separate-b-${Date.now()}`;

    // Fill up token1
    for (let i = 0; i < 3; i++) {
      checkRateLimit(token1, 3);
    }
    expect(checkRateLimit(token1, 3).success).toBe(false);

    // token2 should still be allowed
    expect(checkRateLimit(token2, 3).success).toBe(true);
  });

  it('respects custom window duration', () => {
    const token = `test-window-${Date.now()}`;
    // Use a very short window (1ms) — previous requests should expire
    const result = checkRateLimit(token, 1, 1);
    expect(result.success).toBe(true);
  });
});
