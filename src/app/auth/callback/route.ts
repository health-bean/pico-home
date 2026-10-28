import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, homeInvites, homeMembers } from "@/lib/db/schema";
import { upsertAppUser } from "@/lib/auth/upsert-user";
import { isEmailAllowed } from "@/lib/auth/allow-list";
import { eq, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser?.email) {
        // Beta gate: check allow-list if configured
        if (!isEmailAllowed(authUser.email)) {
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/?error=not_allowed`);
        }

        // Pending invites are NOT accepted here — the invitee accepts or
        // declines them in the app. We only make sure the app user row
        // exists so the invite card can load (on onboarding or dashboard).
        const [pendingInvite] = await db
          .select({ id: homeInvites.id })
          .from(homeInvites)
          .where(
            and(
              eq(homeInvites.invitedEmail, authUser.email.toLowerCase()),
              eq(homeInvites.status, "pending")
            )
          )
          .limit(1);

        let [appUser] = await db
          .select()
          .from(users)
          .where(eq(users.authId, authUser.id));

        if (!appUser && pendingInvite) {
          // Race-safe; only a verified Google identity may adopt an existing
          // row with the same email
          const upserted = await upsertAppUser(authUser);
          if (!upserted) {
            await supabase.auth.signOut();
            return NextResponse.redirect(`${origin}/?error=auth`);
          }
          appUser = upserted;
        }

        if (appUser) {
          const [membership] = await db
            .select()
            .from(homeMembers)
            .where(eq(homeMembers.userId, appUser.id))
            .limit(1);

          if (membership) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
        }
      }

      // No home yet — onboarding (shows any pending invites to accept)
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Auth error
  return NextResponse.redirect(`${origin}/?error=auth`);
}
