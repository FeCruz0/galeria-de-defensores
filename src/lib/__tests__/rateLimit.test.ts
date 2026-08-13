import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, getClientIp } from '../rateLimit';

describe('Sliding Window Rate Limiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow requests under the limit', () => {
    const key = 'test-client-1';
    const allowed1 = checkRateLimit(key, 3, 10000);
    const allowed2 = checkRateLimit(key, 3, 10000);

    expect(allowed1).toBe(true);
    expect(allowed2).toBe(true);
  });

  it('should block requests when limit is exceeded', () => {
    const key = 'test-client-2';
    // Allow 2 requests
    expect(checkRateLimit(key, 2, 10000)).toBe(true);
    expect(checkRateLimit(key, 2, 10000)).toBe(true);
    // Third request should be blocked
    expect(checkRateLimit(key, 2, 10000)).toBe(false);
  });

  it('should allow requests again after window expires', () => {
    const key = 'test-client-3';
    expect(checkRateLimit(key, 1, 5000)).toBe(true);
    expect(checkRateLimit(key, 1, 5000)).toBe(false);

    // Fast forward 6 seconds
    vi.advanceTimersByTime(6000);

    // Should be allowed now
    expect(checkRateLimit(key, 1, 5000)).toBe(true);
  });

  it('should return fallback client IP when headers are not set', async () => {
    const ip = await getClientIp();
    expect(ip).toBe('127.0.0.1');
  });
});
