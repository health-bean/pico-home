import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, homeMembers, pushSubscriptions } from "@/lib/db/schema";
import { eq, lte, and, isNotNull } from "drizzle-orm";
import { sendPushToUser } from "@/lib/push/send";

/**
 * POST /api/push/notify
 *
 * Cron-compatible endpoint that finds overdue tasks and notifies users.
 * Secured via CRON_SECRET header (set in Vercel Cron or call manually).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  let totalSent = 0;
  let totalUsers = 0;

  for (const [userId, tasks] of tasksByUser) {
    if (!subscribedUserIds.has(userId)) continue;

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

    const result = await sendPushToUser(userId, payload);
    totalSent += result.sent;
    totalUsers++;
  }

  return NextResponse.json({
    success: true,
    overdueTaskCount: overdueTasks.length,
    usersNotified: totalUsers,
    notificationsSent: totalSent,
  });
}
