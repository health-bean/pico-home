import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";

export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  await db.insert(pushSubscriptions).values({
    userId: user.id,
    endpoint: body.endpoint,
    p256dhKey: body.keys?.p256dh ?? "",
    authKey: body.keys?.auth ?? "",
    userAgent: request.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({ success: true });
}
