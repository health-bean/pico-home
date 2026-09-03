import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface AuthUserShape {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}

/**
 * Create-or-adopt the app user row for a Supabase auth user.
 * - Normal path: upsert on auth_id (safe against concurrent callbacks).
 * - Recovery path: same email but a different auth_id (the auth user was
 *   deleted and re-created) — the verified email is the identity, so the
 *   existing row adopts the new auth_id instead of 500ing forever.
 */
export async function upsertAppUser(authUser: AuthUserShape) {
  const email = (authUser.email ?? "").toLowerCase();
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    (email ? email.split("@")[0] : "there");
  const avatarUrl =
    (authUser.user_metadata?.avatar_url as string | undefined) ?? null;

  try {
    const [row] = await db
      .insert(users)
      .values({ authId: authUser.id, email, name, avatarUrl })
      .onConflictDoUpdate({
        target: users.authId,
        set: { email, name, avatarUrl, updatedAt: new Date() },
      })
      .returning();
    return row;
  } catch {
    const [row] = await db
      .update(users)
      .set({ authId: authUser.id, name, avatarUrl, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return row ?? null;
  }
}
