import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface AuthUserShape {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  is_anonymous?: boolean;
  app_metadata?: { provider?: string; [key: string]: unknown };
  identities?: { provider: string }[] | null;
  user_metadata?: Record<string, unknown>;
}

/**
 * Only a Google-verified email may claim an existing users row created under a
 * different auth_id. Anything else (email/password, magic link, anonymous,
 * unconfirmed) could be an attacker registering the victim's address.
 */
export function canAdoptExistingRow(authUser: AuthUserShape): boolean {
  if (authUser.is_anonymous) return false;
  if (!authUser.email || !authUser.email_confirmed_at) return false;
  if (authUser.app_metadata?.provider !== "google") return false;
  if (authUser.identities && !authUser.identities.some((i) => i.provider === "google")) {
    return false;
  }
  return true;
}

function isUniqueViolation(error: unknown): boolean {
  const code = (e: unknown) =>
    e && typeof e === "object" && "code" in e ? (e as { code: unknown }).code : undefined;
  const cause = error && typeof error === "object" && "cause" in error
    ? (error as { cause: unknown }).cause
    : undefined;
  return code(error) === "23505" || code(cause) === "23505";
}

/**
 * Create-or-adopt the app user row for a Supabase auth user.
 * - Normal path: upsert on auth_id (safe against concurrent callbacks).
 * - Recovery path: same email but a different auth_id (the auth user was
 *   deleted and re-created). The existing row adopts the new auth_id only for
 *   a verified Google identity (see canAdoptExistingRow); otherwise returns
 *   null and the caller refuses the sign-in.
 */
export async function upsertAppUser(authUser: AuthUserShape) {
  const email = (authUser.email ?? "").toLowerCase();
  if (!email) return null;
  const name =
    (authUser.user_metadata?.full_name as string | undefined) ??
    email.split("@")[0];
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
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    if (!canAdoptExistingRow(authUser)) return null;

    const [row] = await db
      .update(users)
      .set({ authId: authUser.id, name, avatarUrl, updatedAt: new Date() })
      .where(eq(users.email, email))
      .returning();
    return row ?? null;
  }
}
