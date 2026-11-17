import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { taskInstances, homeMembers, users, taskCompletions } from "@/lib/db/schema";
import { eq, and, asc, gte, sql } from "drizzle-orm";
import { clientToday, parseDay, formatDay } from "@/lib/tasks/date-edit";
import { calculateHomeHealthScore } from "@/lib/tasks/scheduling";
import { apiHandler } from "@/lib/api/handler";

export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = searchParams.get("homeId") ?? undefined;
  const home = await getUserHome(user.id, homeId);

  if (!home) {
    return NextResponse.json({ home: null, tasks: [], score: null });
  }

  // Get all active task instances for this home
  const tasks = await db
    .select()
    .from(taskInstances)
    .where(and(eq(taskInstances.homeId, home.id), eq(taskInstances.isActive, true)))
    .orderBy(asc(taskInstances.nextDueDate));

  // Always computed live: a stored score only refreshed on completion, so
  // it went stale as tasks slipped past their dates.
  const computedScore = calculateHomeHealthScore(
    tasks.map((t) => ({
      nextDueDate: new Date(t.nextDueDate),
      priority: t.priority,
      lastCompletedDate: t.lastCompletedDate ? new Date(t.lastCompletedDate) : null,
      isActive: t.isActive ?? true,
      frequencyValue: t.frequencyValue,
      frequencyUnit: t.frequencyUnit,
    }))
  );

  // Split tasks into overdue and upcoming
  // The user's local day (sent by the client), not UTC — in a US evening UTC
  // is already tomorrow, which made this list disagree with Tasks.
  const now = new Date();
  const today = clientToday(searchParams.get("today") ?? undefined, now);

  // Score is always visible — hiding it until something was overdue meant the
  // first score a user ever saw was their worst one.
  const score = computedScore;
  const weekDate = parseDay(today)!;
  weekDate.setDate(weekDate.getDate() + 7);
  const weekFromNow = formatDay(weekDate);

  const overdueTasks = tasks.filter((t) => t.nextDueDate < today);
  const upcomingTasks = tasks.filter(
    (t) => t.nextDueDate >= today && t.nextDueDate <= weekFromNow
  );

  // Focus: the top 3 actionable tasks — overdue first (safety first), then
  // due soon by date (safety first only within the same day).
  type T = (typeof tasks)[number];
  const safetyRank = (t: T) => (t.priority === "safety" ? 0 : 1);
  const safetyFirstThenDate = (a: T, b: T) =>
    safetyRank(a) - safetyRank(b) || a.nextDueDate.localeCompare(b.nextDueDate);
  const dateThenSafety = (a: T, b: T) =>
    a.nextDueDate.localeCompare(b.nextDueDate) || safetyRank(a) - safetyRank(b);
  const focus = [
    ...[...overdueTasks].sort(safetyFirstThenDate),
    ...[...upcomingTasks].sort(dateThenSafety),
  ]
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      name: t.name,
      nextDueDate: t.nextDueDate,
      priority: t.priority,
    }));

  // The most-late overdue safety task: the dashboard headline names it
  // instead of saying "Looking good" while it's outstanding.
  const daysLate = (d: string) =>
    Math.round((Date.parse(today) - Date.parse(d)) / (24 * 60 * 60 * 1000));
  const safetyOverdue = overdueTasks
    .filter((t) => t.priority === "safety")
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));
  const safetyBlocker = safetyOverdue[0]
    ? {
        id: safetyOverdue[0].id,
        name: safetyOverdue[0].name,
        daysLate: daysLate(safetyOverdue[0].nextDueDate),
        others: safetyOverdue.length - 1,
      }
    : null;

  // Count completions this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const completionsThisMonth = await db
    .select()
    .from(taskCompletions)
    .innerJoin(taskInstances, eq(taskCompletions.taskInstanceId, taskInstances.id))
    .where(
      and(
        eq(taskInstances.homeId, home.id),
        gte(taskCompletions.completedAt, startOfMonth)
      )
    );

  // All-time completions — zero means the user hasn't closed the loop once,
  // so the UI keeps welcome framing and never renders the score as a failure.
  const [allTime] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(taskCompletions)
    .innerJoin(taskInstances, eq(taskCompletions.taskInstanceId, taskInstances.id))
    .where(eq(taskInstances.homeId, home.id));

  // Get household members
  const members = await db
    .select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl,
      role: homeMembers.role,
    })
    .from(homeMembers)
    .innerJoin(users, eq(homeMembers.userId, users.id))
    .where(eq(homeMembers.homeId, home.id));

  return NextResponse.json({
    home: {
      id: home.id,
      name: home.name,
      type: home.type,
    },
    score,
    overdue: overdueTasks,
    upcoming: upcomingTasks,
    totalActive: tasks.length,
    userName: user.name,
    members,
    memberRole: home.memberRole,
    completedThisMonth: completionsThisMonth.length,
    completionsAllTime: allTime?.n ?? 0,
    focus,
    safetyBlocker,
  });
});
