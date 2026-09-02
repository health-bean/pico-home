import * as Sentry from "@sentry/nextjs";

/**
 * Next.js instrumentation hook — the only place Sentry server/edge init
 * actually runs under Next 16 (Turbopack). The legacy sentry.server.config.ts
 * convention is not loaded automatically.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
