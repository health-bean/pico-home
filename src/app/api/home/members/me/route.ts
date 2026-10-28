import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homes, homeMembers } from "@/lib/db/schema";
import { and, asc, eq, ne } from "drizzle-orm";
import { apiHandler } from "@/lib/api/handler";
import { getUserHome } from "@/lib/auth/get-user-home";
import { planLeave } from "@/lib/invites/rules";

/**
 * DELETE /api/home/members/me[?homeId=] — leave a home.
 * Members just leave. An owner hands the home to the longest-tenured
 * co-member (same rule as account deletion). A sole owner is refused —
 * leaving would orphan the home; deleting the account removes it.
 */
export const DELETE = apiHandler(async ({ user, request }) => {
  const homeId = new URL(request.url).searchParams.get("homeId") ?? undefined;
  const home = await getUserHome(user.id, homeId);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  const result = await db.transaction(async (tx) => {
    const [heir] = await tx
      .select({ userId: homeMembers.userId })
      .from(homeMembers)
      .where(and(eq(homeMembers.homeId, home.id), ne(homeMembers.userId, user.id)))
      .orderBy(asc(homeMembers.joinedAt))
      .limit(1);

    const plan = planLeave(home.memberRole, heir?.userId ?? null);
    if (plan.kind === "sole_member") return plan;

    if (plan.kind === "transfer") {
      await tx.update(homes).set({ userId: plan.heirUserId }).where(eq(homes.id, home.id));
      await tx
        .update(homeMembers)
        .set({ role: "owner" })
        .where(and(eq(homeMembers.homeId, home.id), eq(homeMembers.userId, plan.heirUserId)));
    }

    await tx
      .delete(homeMembers)
      .where(and(eq(homeMembers.homeId, home.id), eq(homeMembers.userId, user.id)));
    return plan;
  });

  if (result.kind === "sole_member") {
    return NextResponse.json(
      {
        error:
          "You're the only member of this home, so there's no one to hand it to. To remove it, delete your account in Settings.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, transferred: result.kind === "transfer" });
});
