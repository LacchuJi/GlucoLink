/**
 * Simple in-memory sliding-window rate limiter.
 * Resets per server process — adequate for single-instance deployments.
 * For multi-instance production, swap the Map for an Upstash Redis store.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 60_000 * 5) {
      store.delete(key);
    }
  }
}, 60_000 * 5);

export interface RateLimitConfig {
  /** Maximum number of requests allowed per window */
  limit: number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check and increment rate limit for a given key.
 * Returns { success: false } when the limit is exceeded.
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= config.windowMs) {
    // Start fresh window
    store.set(key, { count: 1, windowStart: now });
    return {
      success: true,
      remaining: config.limit - 1,
      resetAt: now + config.windowMs,
    };
  }

  if (entry.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  };
}

/**
 * Extract the best available identifier from a request for rate limit keying.
 * Uses IP address with a prefix to namespace by endpoint.
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  // In Next.js App Router, real IP comes from x-forwarded-for
  const forwarded = (request as Request & { headers: Headers }).headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Pre-configured rate limits for each endpoint category.
 */
export const RATE_LIMITS = {
  /** Auth endpoints: 10 attempts per minute per IP */
  AUTH: { limit: 10, windowMs: 60_000 },
  /** Demo login: 5 per minute per IP (prevents credential scanning) */
  DEMO: { limit: 5, windowMs: 60_000 },
  /** Message sending: 30 per minute per IP */
  MESSAGES: { limit: 30, windowMs: 60_000 },
  /** Reading submission: 60 per minute per IP */
  READINGS: { limit: 60, windowMs: 60_000 },
  /** Onboarding: 5 per 10 minutes per IP */
  ONBOARDING: { limit: 5, windowMs: 10 * 60_000 },
  /** Patient assignment: 20 per minute per IP */
  PATIENTS: { limit: 20, windowMs: 60_000 },
} as const;

/**
 * Helper: return a rate-limited 429 response with Retry-After header.
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  return Response.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
