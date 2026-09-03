import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homes, homeMembers, users } from "@/lib/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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
 * Auth-user removal is best-effort: it runs only when
 * SUPABASE_SERVICE_ROLE_KEY is configured. Without it, re-signup is still
 * safe because user creation upserts on auth_id / adopts by email.
 */
export const DELETE = apiHandler(async ({ user }) => {
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
        await tx.delete(homes).where(eq(homes.id, home.id));
      }
    }

    await tx.delete(homeMembers).where(eq(homeMembers.userId, user.id));
    await tx.delete(users).where(eq(users.id, user.id));
  });

  let authDeleted = false;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (serviceKey && supabaseUrl) {
    try {
      const admin = createAdminClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await admin.auth.admin.deleteUser(user.authId);
      authDeleted = !error;
    } catch {
      // App data is gone; auth cleanup can happen manually in the dashboard.
    }
  }

  return NextResponse.json({ success: true, authDeleted });
});
