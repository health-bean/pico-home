import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { pushSubscribeSchema } from "@/lib/api/schemas";

export const POST = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, pushSubscribeSchema);

  await db.insert(pushSubscriptions).values({
    userId: user.id,
    endpoint: body.endpoint,
    p256dhKey: body.keys.p256dh,
    authKey: body.keys.auth,
    userAgent: request.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({ success: true });
});
