import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  users,
  notificationPreferences,
  homeMembers,
  taskInstances,
  homes,
  taskCompletions,
} from "@/lib/db/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/email/weekly-digest
 *
 * Cron endpoint that sends weekly digest emails via Supabase Edge Functions / Resend.
 * Runs on Monday mornings (configured in vercel.json).
 * Secured via CRON_SECRET.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const today = now.getDay(); // 0 = Sunday, 1 = Monday

  // Find users who opted into weekly digest and whose digest day matches today
  const digestUsers = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      timezone: users.timezone,
    })
    .from(users)
    .innerJoin(
      notificationPreferences,
      eq(users.id, notificationPreferences.userId)
    )
    .where(
      and(
        eq(notificationPreferences.weeklyDigest, true),
        eq(notificationPreferences.weeklyDigestDay, today)
      )
    );

  if (digestUsers.length === 0) {
    return NextResponse.json({ success: true, sent: 0 });
  }

  let sent = 0;
  const errors: string[] = [];

  for (const digestUser of digestUsers) {
    try {
      // Get user's homes
      const userHomes = await db
        .select({
          homeId: homeMembers.homeId,
          homeName: homes.name,
        })
        .from(homeMembers)
        .innerJoin(homes, eq(homeMembers.homeId, homes.id))
        .where(eq(homeMembers.userId, digestUser.userId));

      if (userHomes.length === 0) continue;

      const homeIds = userHomes.map((h) => h.homeId);

      // Get overdue tasks
      const overdue = await db
        .select({
          name: taskInstances.name,
          nextDueDate: taskInstances.nextDueDate,
          homeName: homes.name,
        })
        .from(taskInstances)
        .innerJoin(homes, eq(taskInstances.homeId, homes.id))
        .where(
          and(
            eq(taskInstances.isActive, true),
            lte(taskInstances.nextDueDate, now.toISOString()),
            sql`${taskInstances.homeId} = ANY(${homeIds})`
          )
        );

      // Get upcoming tasks (next 7 days)
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcoming = await db
        .select({
          name: taskInstances.name,
          nextDueDate: taskInstances.nextDueDate,
          homeName: homes.name,
        })
        .from(taskInstances)
        .innerJoin(homes, eq(taskInstances.homeId, homes.id))
        .where(
          and(
            eq(taskInstances.isActive, true),
            gte(taskInstances.nextDueDate, now.toISOString()),
            lte(taskInstances.nextDueDate, nextWeek.toISOString()),
            sql`${taskInstances.homeId} = ANY(${homeIds})`
          )
        );

      // Get completions this week
      const completedCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.completedBy, digestUser.userId),
            gte(taskCompletions.completedAt, oneWeekAgo)
          )
        );

      const completions = completedCount[0]?.count ?? 0;

      // Build email content
      const userName = digestUser.name || "there";
      const overdueList = overdue
        .slice(0, 10)
        .map((t) => `• ${t.name} (${t.homeName})`)
        .join("\n");
      const upcomingList = upcoming
        .slice(0, 10)
        .map((t) => `• ${t.name} — due ${new Date(t.nextDueDate).toLocaleDateString()}`)
        .join("\n");

      const subject =
        overdue.length > 0
          ? `${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} need attention`
          : `Your weekly home update — ${upcoming.length} tasks this week`;

      const body = `Hi ${userName},

Here's your weekly HoneyDoIQ digest:

${overdue.length > 0 ? `🔴 OVERDUE (${overdue.length}):\n${overdueList}\n` : "✅ No overdue tasks — great job!\n"}
${upcoming.length > 0 ? `📅 COMING UP THIS WEEK (${upcoming.length}):\n${upcomingList}\n` : "No tasks due this week.\n"}
📊 COMPLETED THIS WEEK: ${completions} task${completions !== 1 ? "s" : ""}

View your full task list: ${process.env.NEXT_PUBLIC_APP_URL || "https://honeydo-iq.vercel.app"}/tasks

— HoneyDoIQ`;

      // Send via Supabase Edge Functions or direct SMTP
      // For now, use Supabase's built-in email (or swap with Resend/SendGrid)
      const emailApiKey = process.env.EMAIL_API_KEY;
      const emailFrom = process.env.EMAIL_FROM || "noreply@honeydo-iq.com";

      if (emailApiKey && process.env.EMAIL_API_URL) {
        await fetch(process.env.EMAIL_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${emailApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: emailFrom,
            to: digestUser.email,
            subject,
            text: body,
          }),
        });
        sent++;
      } else {
        // Log digest content when no email service configured
        console.log(`[Digest] Would email ${digestUser.email}: ${subject}`);
        sent++;
      }
    } catch (err) {
      errors.push(`${digestUser.email}: ${err}`);
    }
  }

  return NextResponse.json({
    success: true,
    eligible: digestUsers.length,
    sent,
    errors: errors.length > 0 ? errors : undefined,
  });
}
