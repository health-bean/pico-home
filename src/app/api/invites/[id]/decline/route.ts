import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeInvites } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { loadOwnInvite } from "@/lib/invites/load";

/** POST /api/invites/[id]/decline — idempotent. */
export const POST = apiHandler(async ({ authUser, request }) => {
  const invite = await loadOwnInvite(request, authUser);
  if (!invite || invite.status === "accepted") {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status === "pending") {
    // Declines every pending invite to this home for this address
    await db
      .update(homeInvites)
      .set({ status: "declined" })
      .where(
        and(
          eq(homeInvites.homeId, invite.homeId),
          eq(homeInvites.invitedEmail, invite.invitedEmail),
          eq(homeInvites.status, "pending")
        )
      );
  }

  return NextResponse.json({ success: true });
});
