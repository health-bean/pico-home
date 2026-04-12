import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homes, homeMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAppUser } from "@/lib/auth/get-app-user";

/**
 * POST /api/dev/reset-onboarding
 *
 * Deletes all homes (and cascaded data: tasks, systems, appliances, rooms,
 * health flags, health scores, invites, members) for the current user,
 * putting them back into the onboarding flow.
 *
 * Only available in development/preview — blocked in production.
 */
export async function POST() {
  if (process.env.VERCEL_ENV === "production") {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all homes owned by this user (cascades to tasks, systems, etc.)
  const deleted = await db
    .delete(homes)
    .where(eq(homes.userId, user.id))
    .returning({ id: homes.id });

  // Also remove any memberships where user is a member (not owner)
  await db
    .delete(homeMembers)
    .where(eq(homeMembers.userId, user.id));

  return NextResponse.json({
    success: true,
    homesDeleted: deleted.length,
    message: "Refresh the page — you'll be redirected to onboarding.",
  });
}
