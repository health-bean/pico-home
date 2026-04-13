import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { taskInstances, homeMembers, users, homeHealthScores } from "@/lib/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";
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
        }))
      );

  // Split tasks into overdue and upcoming
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const hasTasksDue = tasks.some((t) => t.nextDueDate <= today);
  const score = hasTasksDue ? computedScore : null;
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const overdueTasks = tasks.filter((t) => t.nextDueDate < today);
  const upcomingTasks = tasks.filter(
    (t) => t.nextDueDate >= today && t.nextDueDate <= weekFromNow
  );

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
  });
});
