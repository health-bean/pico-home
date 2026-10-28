import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/log/scrub";

/**
 * Client-side Sentry init. Under Turbopack (Next 16) the legacy
 * sentry.client.config.ts is never loaded — this file is the supported path.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === "production",
  sendDefaultPii: false,
  // Strip SQL params / email addresses from exceptions, extra and breadcrumbs.
  beforeSend: (event) => scrubSentryEvent(event),
  beforeBreadcrumb: (crumb) => scrubSentryEvent({ breadcrumbs: [crumb] }).breadcrumbs![0],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
