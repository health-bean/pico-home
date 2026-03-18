import { describe, it, expect, vi, beforeEach } from "vitest";

// Use dynamic import so we can reset module state between tests
let rateLimit: typeof import("./rate-limit").rateLimit;
let RATE_LIMITS: typeof import("./rate-limit").RATE_LIMITS;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./rate-limit");
  rateLimit = mod.rateLimit;
  RATE_LIMITS = mod.RATE_LIMITS;
});

describe("rateLimit", () => {
  const opts = { max: 3, windowMs: 60_000 };

  it("allows first request", () => {
    const result = rateLimit("user-1", opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.retryAfterMs).toBeNull();
  });

  it("allows requests up to the max", () => {
    rateLimit("user-2", opts);
    rateLimit("user-2", opts);
    const result = rateLimit("user-2", opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("denies requests beyond the max", () => {
    rateLimit("user-3", opts);
    rateLimit("user-3", opts);
    rateLimit("user-3", opts);
    const result = rateLimit("user-3", opts);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different keys independently", () => {
    rateLimit("user-a", opts);
    rateLimit("user-a", opts);
    rateLimit("user-a", opts);

    // Different key should still be allowed
    const result = rateLimit("user-b", opts);
    expect(result.allowed).toBe(true);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    try {
      rateLimit("user-4", opts);
      rateLimit("user-4", opts);
      rateLimit("user-4", opts);

      // Should be denied
      expect(rateLimit("user-4", opts).allowed).toBe(false);

      // Advance past window
      vi.advanceTimersByTime(61_000);

      // Should be allowed again
      const result = rateLimit("user-4", opts);
      expect(result.allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("RATE_LIMITS presets", () => {
  it("has correct preset values", () => {
    expect(RATE_LIMITS.standard).toEqual({ max: 60, windowMs: 60_000 });
    expect(RATE_LIMITS.write).toEqual({ max: 20, windowMs: 60_000 });
    expect(RATE_LIMITS.sensitive).toEqual({ max: 10, windowMs: 60_000 });
  });
});
