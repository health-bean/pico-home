import { z } from "zod";
import type { User } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { homeInvites } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inviteMatchesAuthUser } from "./rules";

/**
 * Load the invite named in /api/invites/[id]/<action>, only if it was sent to
 * the caller's verified email. Anything else looks like "not found".
 */
export async function loadOwnInvite(request: Request, authUser: User) {
  const id = new URL(request.url).pathname.split("/").at(-2);
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return null;

  const [invite] = await db
    .select()
    .from(homeInvites)
    .where(eq(homeInvites.id, parsed.data));

  if (!invite || !inviteMatchesAuthUser(authUser, invite.invitedEmail)) return null;
  return invite;
}
