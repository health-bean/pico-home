import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { users, homeInvites, homeMembers } from "@/lib/db/schema";
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
        const allowList = process.env.ALLOWED_EMAILS;
        if (allowList) {
          const allowed = allowList
            .split(",")
            .map((e) => e.trim().toLowerCase());
          if (!allowed.includes(authUser.email.toLowerCase())) {
            await supabase.auth.signOut();
            return NextResponse.redirect(
              `${origin}/?error=not_allowed`
            );
          }
        }

        // Check if this user has pending invites
        const pendingInvites = await db
          .select()
          .from(homeInvites)
          .where(
            and(
              eq(homeInvites.invitedEmail, authUser.email.toLowerCase()),
              eq(homeInvites.status, "pending")
            )
          );

        if (pendingInvites.length > 0) {
          // Ensure user record exists
          let [appUser] = await db
            .select()
            .from(users)
            .where(eq(users.authId, authUser.id));

          if (!appUser) {
            [appUser] = await db
              .insert(users)
              .values({
                authId: authUser.id,
                email: authUser.email,
                name: authUser.user_metadata?.full_name ?? authUser.email.split("@")[0],
                avatarUrl: authUser.user_metadata?.avatar_url ?? null,
              })
              .returning();
          }

          // Accept all pending invites
          for (const invite of pendingInvites) {
            await db.insert(homeMembers).values({
              homeId: invite.homeId,
              userId: appUser.id,
              role: "member",
              invitedBy: invite.invitedBy,
            });

            await db
              .update(homeInvites)
              .set({ status: "accepted" })
              .where(eq(homeInvites.id, invite.id));
          }

          // Invited user goes straight to dashboard (they already have a home)
          return NextResponse.redirect(`${origin}/dashboard`);
        }

        // Check if user already has a home
        const [appUser] = await db
          .select()
          .from(users)
          .where(eq(users.authId, authUser.id));

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

      // New user with no invites — go to onboarding
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Auth error
  return NextResponse.redirect(`${origin}/?error=auth`);
}
