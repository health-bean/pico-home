import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { homeInvites, homeMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { inviteSchema } from "@/lib/api/schemas";
import { rateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";

// Send an invite
export const POST = apiHandler(
  async ({ user, request }) => {
    // Extra rate limiting for invites (sensitive operation)
    const rl = rateLimit(`${user.id}:invite`, RATE_LIMITS.sensitive);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many invite requests. Please try again later." },
        { status: 429 }
      );
    }

    const home = await getUserHome(user.id);
    if (!home || home.memberRole !== "owner") {
      return NextResponse.json(
        { error: "Only the home owner can invite members" },
        { status: 403 }
      );
    }

    const body = await parseBody(request, inviteSchema);
    const email = body.email;

    // Check if already a member
    const existingMembers = await db
      .select({ email: users.email })
      .from(homeMembers)
      .innerJoin(users, eq(homeMembers.userId, users.id))
      .where(eq(homeMembers.homeId, home.id));

    if (existingMembers.some((m) => m.email.toLowerCase() === email)) {
      return NextResponse.json(
        { error: "This person is already a member" },
        { status: 400 }
      );
    }

    // Check if invite already pending
    const [existingInvite] = await db
      .select()
      .from(homeInvites)
      .where(
        and(
          eq(homeInvites.homeId, home.id),
          eq(homeInvites.invitedEmail, email),
          eq(homeInvites.status, "pending")
        )
      );

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invite already sent to this email" },
        { status: 400 }
      );
    }

    // Check if the invited user already exists (signed up before)
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      // Auto-accept: add them as a member directly
      await db.insert(homeMembers).values({
        homeId: home.id,
        userId: existingUser.id,
        role: "member",
        invitedBy: user.id,
      });

      // Return same shape regardless — prevents email enumeration
      return NextResponse.json({ success: true });
    }

    // Create a pending invite for when they sign up
    await db.insert(homeInvites).values({
      homeId: home.id,
      invitedEmail: email,
      invitedBy: user.id,
    });

    // Same response shape — don't reveal if user exists
    return NextResponse.json({ success: true });
  },
  { rateLimitPreset: "sensitive" }
);

// Get pending invites and current members
export const GET = apiHandler(async ({ user }) => {
  const home = await getUserHome(user.id);
  if (!home) {
    return NextResponse.json({ members: [], invites: [] });
  }

  // Only owners can see pending invites
  const isOwner = home.memberRole === "owner";

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      role: homeMembers.role,
    })
    .from(homeMembers)
    .innerJoin(users, eq(homeMembers.userId, users.id))
    .where(eq(homeMembers.homeId, home.id));

  let invites: typeof homeInvites.$inferSelect[] = [];
  if (isOwner) {
    invites = await db
      .select()
      .from(homeInvites)
      .where(
        and(
          eq(homeInvites.homeId, home.id),
          eq(homeInvites.status, "pending")
        )
      );
  }

  return NextResponse.json({ members, invites });
});
