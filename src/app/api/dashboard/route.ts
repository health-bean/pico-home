import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { db } from "@/lib/db";
import { homes, taskInstances } from "@/lib/db/schema";
import { eq, and, lte, gte, asc, sql } from "drizzle-orm";
import { calculateHomeHealthScore } from "@/lib/tasks/scheduling";

export async function GET() {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's first home
  const [home] = await db
    .select()
    .from(homes)
    .where(eq(homes.userId, user.id))
    .limit(1);

  if (!home) {
    return NextResponse.json({ home: null, tasks: [], score: null });
  }

  // Get all active task instances for this home
  const tasks = await db
    .select()
    .from(taskInstances)
    .where(and(eq(taskInstances.homeId, home.id), eq(taskInstances.isActive, true)))
    .orderBy(asc(taskInstances.nextDueDate));

  // Calculate health score
  const score = calculateHomeHealthScore(
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
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const overdueTasks = tasks.filter((t) => t.nextDueDate < today);
  const upcomingTasks = tasks.filter(
    (t) => t.nextDueDate >= today && t.nextDueDate <= weekFromNow
  );

  return NextResponse.json({
    home: {
      id: home.id,
      name: home.name,
      type: home.type,
    },
    score,
    overdue: overdueTasks.slice(0, 10),
    upcoming: upcomingTasks.slice(0, 10),
    totalActive: tasks.length,
    userName: user.name,
  });
}
