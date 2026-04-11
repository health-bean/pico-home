import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Verify cron endpoint authorization using timing-safe comparison.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export function verifyCronAuth(request: Request): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = `Bearer ${cronSecret}`;

  // Timing-safe comparison to prevent timing attacks
  if (authHeader.length !== expected.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isValid = timingSafeEqual(
    Buffer.from(authHeader),
    Buffer.from(expected)
  );

  if (!isValid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
