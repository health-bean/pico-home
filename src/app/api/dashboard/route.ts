import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { taskInstances, homeMembers, users, homeHealthScores, taskCompletions } from "@/lib/db/schema";
import { eq, and, asc, desc, gte, sql } from "drizzle-orm";
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

  // Try to read precomputed health score first, fall back to live calculation
  const storedScores = await db
    .select()
    .from(homeHealthScores)
    .where(eq(homeHealthScores.homeId, home.id))
    .orderBy(desc(homeHealthScores.calculatedAt))
    .limit(1);

  const computedScore = storedScores.length > 0
    ? {
        overall: storedScores[0].score,
        criticalTasks: storedScores[0].criticalTasksScore,
        preventiveCare: storedScores[0].preventiveCareScore,
        homeEfficiency: storedScores[0].homeEfficiencyScore,
      }
    : calculateHomeHealthScore(
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
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Score is always visible — hiding it until something was overdue meant the
  // first score a user ever saw was their worst one.
  const score = computedScore;
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const overdueTasks = tasks.filter((t) => t.nextDueDate < today);
  const upcomingTasks = tasks.filter(
    (t) => t.nextDueDate >= today && t.nextDueDate <= weekFromNow
  );

  // Focus: the top 3 actionable tasks — overdue first, then due soon;
  // safety priority first within each group, then by date.
  const safetyFirstThenDate = (
    a: (typeof tasks)[number],
    b: (typeof tasks)[number]
  ) =>
    (a.priority === "safety" ? 0 : 1) - (b.priority === "safety" ? 0 : 1) ||
    a.nextDueDate.localeCompare(b.nextDueDate);
  const focus = [
    ...[...overdueTasks].sort(safetyFirstThenDate),
    ...[...upcomingTasks].sort(safetyFirstThenDate),
  ]
    .slice(0, 3)
    .map((t) => ({
      id: t.id,
      name: t.name,
      nextDueDate: t.nextDueDate,
      priority: t.priority,
    }));

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
  });
});
