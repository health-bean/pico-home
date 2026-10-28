import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, homes, homeMembers, users } from "@/lib/db/schema";
import { and, asc, eq, ne, notExists } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENTS_BUCKET,
  getServiceRoleClient,
  purgeDocumentFiles,
} from "@/lib/storage/documents";

/**
 * DELETE /api/user — delete the caller's account.
 *
 * Homes the user owns are transferred to their longest-tenured co-member
 * (who becomes owner); homes with no other members are deleted (cascades
 * tasks, systems, appliances, health flags, scores). The users row then
 * cascades contractors, documents, push subscriptions, notification prefs,
 * and the send log; completions/invite links survive with a NULLed author
 * (migration 0011).
 *
 * Document files are removed from Storage *before* the DB transaction, while
 * the caller still has home access (so the user-session client works when
 * the service role isn't configured). Order rationale: if the transaction
 * then fails, the user is left with rows pointing at missing files and can
 * simply retry; the reverse order would risk orphaned, untracked PII files.
 * Storage failures are logged (counts only) and never block deletion.
 *
 * Auth-user removal is best-effort: it runs only when
 * SUPABASE_SERVICE_ROLE_KEY is configured. Without it, re-signup is still
 * safe because user creation upserts on auth_id / adopts by email.
 */
export const DELETE = apiHandler(async ({ user }) => {
  // Homes that will be deleted: owned by the caller with no other members.
  const soloHomes = await db
    .select({ id: homes.id })
    .from(homes)
    .where(
      and(
        eq(homes.userId, user.id),
        notExists(
          db
            .select({ one: homeMembers.id })
            .from(homeMembers)
            .where(and(eq(homeMembers.homeId, homes.id), ne(homeMembers.userId, user.id)))
        )
      )
    );
  const ownDocs = await db
    .select({ fileUrl: documents.fileUrl })
    .from(documents)
    .where(eq(documents.userId, user.id));

  const admin = getServiceRoleClient();
  const storage = (admin ?? (await createClient())).storage.from(DOCUMENTS_BUCKET);
  await purgeDocumentFiles(storage, {
    paths: ownDocs.map((d) => d.fileUrl),
    homeIds: soloHomes.map((h) => h.id),
  });

  await db.transaction(async (tx) => {
    const owned = await tx
      .select({ id: homes.id })
      .from(homes)
      .where(eq(homes.userId, user.id));

    for (const home of owned) {
      const [heir] = await tx
        .select({ userId: homeMembers.userId })
        .from(homeMembers)
        .where(and(eq(homeMembers.homeId, home.id), ne(homeMembers.userId, user.id)))
        .orderBy(asc(homeMembers.joinedAt))
        .limit(1);

      if (heir) {
        await tx.update(homes).set({ userId: heir.userId }).where(eq(homes.id, home.id));
        await tx
          .update(homeMembers)
          .set({ role: "owner" })
          .where(and(eq(homeMembers.homeId, home.id), eq(homeMembers.userId, heir.userId)));
      } else {
        // Former members' documents would otherwise survive with home_id
        // NULLed, pointing at files we just purged.
        await tx.delete(documents).where(eq(documents.homeId, home.id));
        await tx.delete(homes).where(eq(homes.id, home.id));
      }
    }

    await tx.delete(homeMembers).where(eq(homeMembers.userId, user.id));
    await tx.delete(users).where(eq(users.id, user.id));
  });

  let authDeleted = false;
  if (admin) {
    try {
      const { error } = await admin.auth.admin.deleteUser(user.authId);
      authDeleted = !error;
    } catch {
      // App data is gone; auth cleanup can happen manually in the dashboard.
    }
  }

  return NextResponse.json({ success: true, authDeleted });
});
