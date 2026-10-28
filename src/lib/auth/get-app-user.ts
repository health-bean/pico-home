import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isEmailAllowed } from "./allow-list";

type AppUserRow = typeof users.$inferSelect;

/**
 * The signed-in Supabase auth user plus our users row. Null if not signed in,
 * not on the beta allow-list (ALLOWED_EMAILS), or no app user exists yet.
 */
export async function getAuthContext(): Promise<{
  authUser: User;
  appUser: AppUserRow;
} | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;
  if (!isEmailAllowed(authUser.email)) return null;

  const [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.authId, authUser.id));

  return appUser ? { authUser, appUser } : null;
}

/**
 * Get the authenticated app user (from our users table, not Supabase auth).
 * Returns null if not authenticated or no app user record exists.
 */
export async function getAppUser() {
  return (await getAuthContext())?.appUser ?? null;
}
