import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, homes, homeMembers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENTS_BUCKET,
  getServiceRoleClient,
  purgeDocumentFiles,
} from "@/lib/storage/documents";
import { isDevResetAllowed } from "@/lib/api/dev-guard";

/**
 * POST /api/dev/reset-onboarding
 *
 * Deletes all homes (and cascaded data: tasks, systems, appliances, rooms,
 * health flags, health scores, invites, members) for the current user,
 * putting them back into the onboarding flow. Document rows and their
 * Storage files for those homes are removed too.
 *
 * Only available in local development and Vercel preview — see
 * isDevResetAllowed (fails closed on any production build that isn't a
 * Vercel preview).
 */
export const POST = apiHandler(async ({ user }) => {
  if (!isDevResetAllowed(process.env)) {
    return NextResponse.json(
      { error: "Not available in production" },
      { status: 403 }
    );
  }

  const owned = await db
    .select({ id: homes.id })
    .from(homes)
    .where(eq(homes.userId, user.id));
  const homeIds = owned.map((h) => h.id);

  if (homeIds.length) {
    const admin = getServiceRoleClient();
    const storage = (admin ?? (await createClient())).storage.from(DOCUMENTS_BUCKET);
    await purgeDocumentFiles(storage, { paths: [], homeIds });
    await db.delete(documents).where(inArray(documents.homeId, homeIds));
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
});
