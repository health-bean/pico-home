import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the authenticated app user (from our users table, not Supabase auth).
 * Returns null if not authenticated or no app user record exists.
 */
export async function getAppUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [appUser] = await db
    .select()
    .from(users)
    .where(eq(users.authId, authUser.id));

  return appUser ?? null;
}
