import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { pushSubscribeSchema } from "@/lib/api/schemas";

export const POST = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, pushSubscribeSchema);

  // Check if subscription with same endpoint already exists for this user
  const existing = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, user.id),
        eq(pushSubscriptions.endpoint, body.endpoint)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ success: true });
  }

  // Check total subscription count for the user
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id));

  if ((countResult[0]?.count ?? 0) >= 10) {
    return NextResponse.json(
      { error: "Too many subscriptions" },
      { status: 400 }
    );
  }

  await db.insert(pushSubscriptions).values({
    userId: user.id,
    endpoint: body.endpoint,
    p256dhKey: body.keys.p256dh,
    authKey: body.keys.auth,
    userAgent: request.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({ success: true });
});
