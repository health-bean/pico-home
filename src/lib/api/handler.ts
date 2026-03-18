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

/**
 * Wraps an API route handler with:
 * - Authentication check
 * - Rate limiting
 * - Error handling (catches DB errors, Zod errors, unexpected errors)
 */
export function apiHandler(handler: HandlerFn, options?: ApiHandlerOptions) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (request: Request, _routeParams?: unknown) => {
    try {
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
