import { headers } from 'next/headers';

// Memory store for rate limits
const rateLimitStore = new Map<string, number[]>();

// Periodic cleanup of the rate limit store to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function performCleanup() {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitStore.entries()) {
    // Keep only timestamps that are not expired for any typical window size (max window 15 min)
    const validTimestamps = timestamps.filter(t => now - t < 15 * 60 * 1000);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, validTimestamps);
    }
  }
  lastCleanup = now;
}

/**
 * Checks if a request exceeds the specified rate limit.
 * @param identifier Unique key representing the client (IP, user ID, etc.)
 * @param limit Maximum number of requests allowed in the window
 * @param windowMs Time window in milliseconds
 * @returns true if the request is allowed, false if it is blocked
 */
export function checkRateLimit(identifier: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Run cleanup if interval has passed
  if (now - lastCleanup > CLEANUP_INTERVAL_MS) {
    performCleanup();
  }

  const timestamps = rateLimitStore.get(identifier) || [];
  const activeTimestamps = timestamps.filter(t => now - t < windowMs);

  if (activeTimestamps.length >= limit) {
    return false;
  }

  activeTimestamps.push(now);
  rateLimitStore.set(identifier, activeTimestamps);
  return true;
}

/**
 * Safely extracts the client IP address from request headers.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    const realIp = headersList.get('x-real-ip');
    if (realIp) {
      return realIp;
    }
  } catch (e) {
    // Fallback if headers cannot be read (e.g. in test/non-HTTP context)
  }
  return '127.0.0.1';
}

/**
 * High-level helper to easily rate limit server actions.
 */
export async function checkActionRateLimit(
  userId: string | undefined,
  actionGroup: string,
  limit = 15,
  windowMs = 60000
): Promise<boolean> {
  const ip = await getClientIp();
  const key = `ratelimit:${actionGroup}:${userId || ip}`;
  return checkRateLimit(key, limit, windowMs);
}
