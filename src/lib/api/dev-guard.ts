/**
 * Dev-only endpoints (e.g. /api/dev/reset-onboarding) run in local dev and on
 * Vercel preview deployments (the documented tester reset workflow), and
 * nowhere else. Fails closed: any production build that isn't positively a
 * Vercel preview — including self-hosted or VERCEL_ENV-less builds — is
 * blocked.
 */
export function isDevResetAllowed(env: {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
}): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.NODE_ENV !== "production") return true;
  return env.VERCEL_ENV === "preview";
}
