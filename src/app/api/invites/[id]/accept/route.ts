import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeInvites, homeMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { loadOwnInvite } from "@/lib/invites/load";

/** POST /api/invites/[id]/accept — join the home. Idempotent. */
export const POST = apiHandler(async ({ user, authUser, request }) => {
  const invite = await loadOwnInvite(request, authUser);
  if (!invite || invite.status === "declined") {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status === "accepted") {
    // Retry of a completed accept is a no-op; a stale accepted invite must
    // not re-add someone who has since left the home.
    const [membership] = await db
      .select({ id: homeMembers.id })
      .from(homeMembers)
      .where(and(eq(homeMembers.homeId, invite.homeId), eq(homeMembers.userId, user.id)));
    if (!membership) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, homeId: invite.homeId });
  }

  await db.transaction(async (tx) => {
    await tx
      .insert(homeMembers)
      .values({
        homeId: invite.homeId,
        userId: user.id,
        role: "member",
        invitedBy: invite.invitedBy,
      })
      .onConflictDoNothing({ target: [homeMembers.homeId, homeMembers.userId] });

    // Settle every pending invite to this home for this address
    await tx
      .update(homeInvites)
      .set({ status: "accepted" })
      .where(
        and(
          eq(homeInvites.homeId, invite.homeId),
          eq(homeInvites.invitedEmail, invite.invitedEmail),
          eq(homeInvites.status, "pending")
        )
      );
  });

  return NextResponse.json({ success: true, homeId: invite.homeId });
});
