import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { homeInvites, homeMembers, users } from "@/lib/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { inviteSchema } from "@/lib/api/schemas";
import { sendEmail } from "@/lib/email/send";
import { rateLimit, RATE_LIMITS } from "@/lib/api/rate-limit";
import {
  buildInviteEmail,
  isOverDailyInviteCap,
  INVITE_CAP_WINDOW_MS,
} from "@/lib/invites/rules";

function homeIdParam(request: Request) {
  return new URL(request.url).searchParams.get("homeId") ?? undefined;
}

// Send an invite. Every invite — whether or not the address already has an
// account — is a pending row the invitee must explicitly accept in the app.
// The response never reveals whether the address has an account.
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

    const home = await getUserHome(user.id, homeIdParam(request));
    if (!home || home.memberRole !== "owner") {
      return NextResponse.json(
        { error: "Only the home owner can invite members" },
        { status: 403 }
      );
    }

    const body = await parseBody(request, inviteSchema);
    const email = body.email;

    // Durable daily cap (the in-memory limiter doesn't span instances)
    const [{ sent }] = await db
      .select({ sent: count() })
      .from(homeInvites)
      .where(
        and(
          eq(homeInvites.invitedBy, user.id),
          gte(homeInvites.createdAt, new Date(Date.now() - INVITE_CAP_WINDOW_MS))
        )
      );
    if (isOverDailyInviteCap(Number(sent))) {
      return NextResponse.json(
        { error: "You've sent a lot of invites today. Please try again tomorrow." },
        { status: 429 }
      );
    }

    // Check if already a member of this home
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
      .select({ id: homeInvites.id })
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

    await db.insert(homeInvites).values({
      homeId: home.id,
      invitedEmail: email,
      invitedBy: user.id,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://picohome.app";
    const emailSent = await sendEmail({
      to: email,
      ...buildInviteEmail({ inviterName: user.name, appUrl }),
    });

    return NextResponse.json({ success: true, emailSent });
  },
  { rateLimitPreset: "sensitive" }
);

// Current (accepted) members, plus — for the owner only — pending invites as
// the email address they typed. Nothing about the invitee's account is shown.
export const GET = apiHandler(async ({ user, request }) => {
  const home = await getUserHome(user.id, homeIdParam(request));
  if (!home) {
    return NextResponse.json({ members: [], invites: [] });
  }

  const isOwner = home.memberRole === "owner";

  const members = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: homeMembers.role,
    })
    .from(homeMembers)
    .innerJoin(users, eq(homeMembers.userId, users.id))
    .where(eq(homeMembers.homeId, home.id))
    .orderBy(homeMembers.joinedAt);

  const invites = isOwner
    ? await db
        .select({
          id: homeInvites.id,
          invitedEmail: homeInvites.invitedEmail,
          status: homeInvites.status,
          createdAt: homeInvites.createdAt,
        })
        .from(homeInvites)
        .where(
          and(
            eq(homeInvites.homeId, home.id),
            eq(homeInvites.status, "pending")
          )
        )
    : [];

  // currentUserId drives the "You" badge; isOwner hides Invite from members
  return NextResponse.json({ members, invites, currentUserId: user.id, isOwner });
});
