import * as Sentry from "@sentry/nextjs";

/**
 * Client-side Sentry init. Under Turbopack (Next 16) the legacy
 * sentry.client.config.ts is never loaded — this file is the supported path.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
