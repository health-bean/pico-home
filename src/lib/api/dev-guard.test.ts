import { describe, it, expect } from "vitest";
import { isDevResetAllowed } from "./dev-guard";

describe("isDevResetAllowed", () => {
  it("allows local dev", () => {
    expect(isDevResetAllowed({ NODE_ENV: "development" })).toBe(true);
  });
  it("allows Vercel preview (CLAUDE.md reset workflow)", () => {
    expect(isDevResetAllowed({ NODE_ENV: "production", VERCEL_ENV: "preview" })).toBe(true);
  });
  it("blocks Vercel production", () => {
    expect(isDevResetAllowed({ NODE_ENV: "production", VERCEL_ENV: "production" })).toBe(false);
  });
  it("blocks a production build outside Vercel (VERCEL_ENV unset)", () => {
    expect(isDevResetAllowed({ NODE_ENV: "production" })).toBe(false);
  });
  it("blocks VERCEL_ENV=production even if NODE_ENV is odd", () => {
    expect(isDevResetAllowed({ NODE_ENV: "development", VERCEL_ENV: "production" })).toBe(false);
  });
});
