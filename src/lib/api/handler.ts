import { NextResponse } from "next/server";
import { type ZodSchema } from "zod";
import * as Sentry from "@sentry/nextjs";
import { getAppUser } from "@/lib/auth/get-app-user";
import { rateLimit, RATE_LIMITS } from "./rate-limit";

type AppUser = NonNullable<Awaited<ReturnType<typeof getAppUser>>>;

interface HandlerContext {
  user: AppUser;
  request: Request;
}

type HandlerFn = (ctx: HandlerContext) => Promise<NextResponse>;

interface ApiHandlerOptions {
  /** Rate limit preset. Defaults to "standard" for GET, "write" for mutations */
  rateLimitPreset?: keyof typeof RATE_LIMITS;
}

const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL || "https://honeydoiq.app",
  "https://honeydoiq.app",
  // Capacitor native apps send null origin
]);

/**
 * Check CSRF protection for state-changing requests.
 * Verifies the Origin header matches our allowed origins.
 * GET/HEAD/OPTIONS are safe methods and skip this check.
 */
export function checkCsrf(request: Request): boolean {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = request.headers.get("origin");

  // Capacitor native apps and same-origin fetch() may not send Origin
  if (!origin) {
    // Fall back to Referer check
    const referer = request.headers.get("referer");
    if (!referer) return true; // No origin info = same-origin or native app
    try {
      const refererOrigin = new URL(referer).origin;
      return ALLOWED_ORIGINS.has(refererOrigin);
    } catch {
      return false;
    }
  }

  return ALLOWED_ORIGINS.has(origin);
}

/**
 * Wraps an API route handler with:
 * - CSRF protection (origin checking)
 * - Authentication check
 * - Rate limiting
 * - Error handling (catches DB errors, Zod errors, unexpected errors)
 */
export function apiHandler(handler: HandlerFn, options?: ApiHandlerOptions) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (request: Request, _routeParams?: unknown) => {
    try {
      // 0. CSRF protection
      if (!checkCsrf(request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // 0.5 Request body size limit (1MB for JSON endpoints)
      const contentLength = request.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 1_048_576) {
        return NextResponse.json(
          { error: "Request body too large" },
          { status: 413 }
        );
      }

      // 1. Authenticate
      const user = await getAppUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // 2. Rate limit by user ID
      const method = request.method;
      const preset =
        options?.rateLimitPreset ??
        (method === "GET" ? "standard" : "write");
      const result = rateLimit(`${user.id}:${preset}`, RATE_LIMITS[preset]);

      if (!result.allowed) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.ceil((result.retryAfterMs ?? 60_000) / 1000)
              ),
            },
          }
        );
      }

      // 3. Run the handler
      return await handler({ user, request });
    } catch (error) {
      // Zod validation errors
      if (
        error instanceof Error &&
        error.name === "ZodError" &&
        "issues" in error
      ) {
        const issues = (error as { issues: Array<{ path: (string | number)[]; message: string }> }).issues;
        return NextResponse.json(
          {
            error: "Validation error",
            details: issues.map((e) => ({
              path: e.path.join("."),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }

      Sentry.captureException(error);
      console.error("[API Error]", error);

      return NextResponse.json(
        { error: "An unexpected error occurred" },
        { status: 500 }
      );
    }
  };
}

/**
 * Parse and validate a JSON request body against a Zod schema.
 * Throws ZodError on failure (caught by apiHandler).
 */
export async function parseBody<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const raw = await request.json();
  return schema.parse(raw);
}

/**
 * Parse body with fallback for optional bodies (e.g. skip endpoint).
 */
export async function parseBodyOrDefault<T>(
  request: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const raw = await request.json().catch(() => ({}));
  return schema.parse(raw);
}
