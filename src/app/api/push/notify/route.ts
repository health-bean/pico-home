import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, homeMembers, pushSubscriptions, notificationPreferences, notificationLog } from "@/lib/db/schema";
import { eq, lte, and, isNotNull } from "drizzle-orm";
import { sendPushToUser } from "@/lib/push/send";
import { verifyCronAuth } from "@/lib/api/cron-auth";

/**
 * POST /api/push/notify
 *
 * Cron-compatible endpoint that finds overdue tasks and notifies users.
 * Secured via CRON_SECRET header (set in Vercel Cron or call manually).
 */
export async function POST(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const now = new Date().toISOString();

  // Find all overdue active tasks with their home memberships
  const overdueTasks = await db
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
        lte(taskInstances.nextDueDate, now),
        isNotNull(taskInstances.nextDueDate)
      )
    );

  // Group overdue tasks by user
  const tasksByUser = new Map<string, typeof overdueTasks>();
  for (const task of overdueTasks) {
    const existing = tasksByUser.get(task.memberId) ?? [];
    existing.push(task);
    tasksByUser.set(task.memberId, existing);
  }

  // Only notify users who have push subscriptions
  const usersWithSubs = await db
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions);
  const subscribedUserIds = new Set(usersWithSubs.map((u) => u.userId));

  // Consent: skip users who turned push off (absent row = default on)
  const prefRows = await db
    .select({
      userId: notificationPreferences.userId,
      pushEnabled: notificationPreferences.pushEnabled,
    })
    .from(notificationPreferences);
  const pushOff = new Set(
    prefRows.filter((r) => r.pushEnabled === false).map((r) => r.userId)
  );

  const sentOn = new Date().toISOString().split("T")[0];
  let totalSent = 0;
  let totalUsers = 0;

  for (const [userId, tasks] of tasksByUser) {
    if (!subscribedUserIds.has(userId)) continue;
    if (pushOff.has(userId)) continue;

    // Idempotency: one overdue push per user per day, even across retries
    const inserted = await db
      .insert(notificationLog)
      .values({ userId, kind: "push_overdue", sentOn })
      .onConflictDoNothing()
      .returning({ id: notificationLog.id });
    if (inserted.length === 0) continue;

    const count = tasks.length;
    const topTasks = tasks
      .slice(0, 3)
      .map((t) => t.taskName)
      .join(", ");

    const payload = {
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
    };

    try {
      const result = await sendPushToUser(userId, payload);
      totalSent += result.sent;
      totalUsers++;
    } catch (err) {
      console.error(`[Push] send failed for user_${userId}:`, err instanceof Error ? err.name : "unknown");
    }
  }

  return NextResponse.json({
    success: true,
    overdueTaskCount: overdueTasks.length,
    usersNotified: totalUsers,
    notificationsSent: totalSent,
  });
}

// Vercel Cron invokes cron paths with HTTP GET; keep POST for manual runs.
export const GET = POST;
