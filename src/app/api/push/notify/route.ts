import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  taskInstances,
  homeMembers,
  pushSubscriptions,
  notificationPreferences,
  notificationLog,
} from "@/lib/db/schema";
import { eq, lte, and, isNotNull } from "drizzle-orm";
import { sendPushToUser } from "@/lib/push/send";
import { verifyCronAuth } from "@/lib/api/cron-auth";

const DEFAULT_REMINDER_DAYS = [1, 3, 7];
const HORIZON_DAYS = 14;

/**
 * POST /api/push/notify
 *
 * Daily cron: sends (1) an overdue summary and (2) a "coming up" heads-up for
 * tasks due in each user's reminderDaysBefore window. One push per kind per
 * user per day (notification_log), honoring the pushEnabled preference.
 */
export async function POST(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + HORIZON_DAYS);
  const horizonStr = horizon.toISOString().split("T")[0];

  // Active tasks due within the horizon (overdue included), per member
  const dueSoonTasks = await db
    .select({
      taskId: taskInstances.id,
      taskName: taskInstances.name,
      homeId: taskInstances.homeId,
      nextDueDate: taskInstances.nextDueDate,
      memberId: homeMembers.userId,
    })
    .from(taskInstances)
    .innerJoin(homeMembers, eq(taskInstances.homeId, homeMembers.homeId))
    .where(
      and(
        eq(taskInstances.isActive, true),
        lte(taskInstances.nextDueDate, horizonStr),
        isNotNull(taskInstances.nextDueDate)
      )
    );

  type DueTask = (typeof dueSoonTasks)[number];
  const overdueByUser = new Map<string, DueTask[]>();
  const upcomingByUser = new Map<string, DueTask[]>();
  for (const task of dueSoonTasks) {
    const bucket = task.nextDueDate <= todayStr ? overdueByUser : upcomingByUser;
    const existing = bucket.get(task.memberId) ?? [];
    existing.push(task);
    bucket.set(task.memberId, existing);
  }

  // Only notify users who have push subscriptions
  const usersWithSubs = await db
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  const subscribedUserIds = new Set(usersWithSubs.map((u) => u.userId));

  // Preferences: consent + per-user reminder windows (absent row = defaults)
  const prefRows = await db
    .select({
      userId: notificationPreferences.userId,
      pushEnabled: notificationPreferences.pushEnabled,
      reminderDaysBefore: notificationPreferences.reminderDaysBefore,
    })
    .from(notificationPreferences);
  const pushOff = new Set(
    prefRows.filter((r) => r.pushEnabled === false).map((r) => r.userId)
  );
  const reminderDays = new Map(
    prefRows.map((r) => [r.userId, r.reminderDaysBefore ?? DEFAULT_REMINDER_DAYS])
  );

  const daysUntil = (dateStr: string) =>
    Math.round(
      (new Date(dateStr + "T00:00:00Z").getTime() -
        new Date(todayStr + "T00:00:00Z").getTime()) /
        86_400_000
    );

  /** Send at most once per user/kind/day; returns pushes delivered. */
  async function sendOnce(
    userId: string,
    kind: string,
    payload: { title: string; body: string; tag: string; url: string }
  ): Promise<number> {
    if (!subscribedUserIds.has(userId) || pushOff.has(userId)) return 0;
    const inserted = await db
      .insert(notificationLog)
      .values({ userId, kind, sentOn: todayStr })
      .onConflictDoNothing()
      .returning({ id: notificationLog.id });
    if (inserted.length === 0) return 0;
    try {
      const result = await sendPushToUser(userId, payload);
      return result.sent;
    } catch (err) {
      console.error(
        `[Push] send failed for user_${userId}:`,
        err instanceof Error ? err.name : "unknown"
      );
      return 0;
    }
  }

  let totalSent = 0;
  let usersNotified = 0;

  // 1. Overdue summary
  for (const [userId, tasks] of overdueByUser) {
    const count = tasks.length;
    const topTasks = tasks.slice(0, 3).map((t) => t.taskName).join(", ");
    const sent = await sendOnce(userId, "push_overdue", {
      title:
        count === 1
          ? `Task due: ${tasks[0].taskName}`
          : `${count} tasks need attention`,
      body:
        count === 1
          ? `Your ${tasks[0].taskName} task is overdue.`
          : `Overdue: ${topTasks}${count > 3 ? ` and ${count - 3} more` : ""}`,
      tag: "overdue-reminder",
      url: "/tasks",
    });
    if (sent > 0) usersNotified++;
    totalSent += sent;
  }

  // 2. Heads-up for tasks landing in the user's reminder window
  let upcomingSent = 0;
  for (const [userId, tasks] of upcomingByUser) {
    const windows = reminderDays.get(userId) ?? DEFAULT_REMINDER_DAYS;
    const matching = tasks.filter((t) => windows.includes(daysUntil(t.nextDueDate)));
    if (matching.length === 0) continue;
    matching.sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
    const first = matching[0];
    const firstDays = daysUntil(first.nextDueDate);
    const sent = await sendOnce(userId, "push_upcoming", {
      title:
        matching.length === 1
          ? `Coming up: ${first.taskName}`
          : `${matching.length} tasks coming up`,
      body:
        matching.length === 1
          ? `${first.taskName} is due in ${firstDays} day${firstDays === 1 ? "" : "s"}.`
          : `Next: ${matching.slice(0, 3).map((t) => t.taskName).join(", ")}${matching.length > 3 ? "…" : ""}`,
      tag: "upcoming-reminder",
      url: "/tasks",
    });
    upcomingSent += sent;
    totalSent += sent;
  }

  return NextResponse.json({
    success: true,
    overdueUsers: overdueByUser.size,
    upcomingPushesSent: upcomingSent,
    usersNotified,
    notificationsSent: totalSent,
  });
}

// Vercel Cron invokes cron paths with HTTP GET; keep POST for manual runs.
export const GET = POST;
