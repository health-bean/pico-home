/**
 * In-memory sliding-window rate limiter.
 *
 * Known limitation: state is per-instance. On Vercel Fluid Compute, function
 * instances are reused across concurrent requests so this is effective within
 * a single instance, but a determined attacker routed to a different instance
 * can get extra requests through. At current scale this is acceptable.
 *
 * For stricter enforcement, swap with Upstash Redis (@upstash/ratelimit) or
 * Vercel KV — keep the same `rateLimit(key, options)` API so callers don't
 * need to change.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes to prevent memory leak
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

interface RateLimitOptions {
  /** Max requests per window */
  max: number;
  /** Window size in milliseconds */
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
}

export function rateLimit(
  key: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - options.windowMs;

  cleanup(options.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= options.max) {
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: oldestInWindow + options.windowMs - now,
    };
  }

  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: options.max - entry.timestamps.length,
    retryAfterMs: null,
  };
}

// Preset configurations
export const RATE_LIMITS = {
  /** Standard API: 60 requests per minute */
  standard: { max: 60, windowMs: 60_000 },
  /** Write operations: 20 per minute */
  write: { max: 20, windowMs: 60_000 },
  /** Sensitive operations (invites, auth): 10 per minute */
  sensitive: { max: 10, windowMs: 60_000 },
} as const;
