import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Document thumbnails/links are Supabase Storage signed URLs; avatars come
// from the Google profile (lh3.googleusercontent.com).
const SUPABASE_ORIGIN = "https://*.supabase.co";
const GOOGLE_AVATAR_ORIGIN = "https://lh3.googleusercontent.com";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            // The web app uses none of these (document photos go through a
            // plain file picker, which needs no camera permission).
            key: "Permissions-Policy",
            value: [
              "camera=()",
              "microphone=()",
              "geolocation=()",
              "payment=()",
              "usb=()",
              "browsing-topics=()",
            ].join(", "),
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${SUPABASE_ORIGIN} ${GOOGLE_AVATAR_ORIGIN}`,
              "font-src 'self' https://fonts.gstatic.com",
              // Resend is called server-side only, so it isn't listed here.
              `connect-src 'self' ${SUPABASE_ORIGIN} https://*.sentry.io`,
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// Only apply Sentry build plugin when auth token is available (CI/production)
const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN;

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    })
  : nextConfig;
