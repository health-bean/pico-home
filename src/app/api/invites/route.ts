import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeInvites, homeMembers, homes, users } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { summarizePendingInvites } from "@/lib/invites/rules";

/** GET /api/invites — pending invites addressed to my verified email. */
export const GET = apiHandler(async ({ user, authUser }) => {
  const email = authUser.email?.toLowerCase();
  if (!email || !authUser.email_confirmed_at) {
    return NextResponse.json({ invites: [] });
  }

  const rows = await db
    .select({
      id: homeInvites.id,
      homeId: homeInvites.homeId,
      homeName: homes.name,
      inviterName: users.name,
      createdAt: homeInvites.createdAt,
    })
    .from(homeInvites)
    .innerJoin(homes, eq(homeInvites.homeId, homes.id))
    .innerJoin(users, eq(homeInvites.invitedBy, users.id))
    .where(and(eq(homeInvites.invitedEmail, email), eq(homeInvites.status, "pending")));

  const memberships = await db
    .select({ homeId: homeMembers.homeId })
    .from(homeMembers)
    .where(eq(homeMembers.userId, user.id));

  const invites = summarizePendingInvites(
    rows,
    memberships.map((m) => m.homeId)
  ).map(({ id, homeName, inviterName, createdAt }) => ({
    id,
    homeName,
    inviterName,
    createdAt,
  }));

  return NextResponse.json({ invites });
});
