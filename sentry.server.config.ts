import * as Sentry from "@sentry/nextjs";
import { scrubSentryEvent } from "@/lib/log/scrub";

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
