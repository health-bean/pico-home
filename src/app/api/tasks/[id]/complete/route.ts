import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, taskCompletions, homeHealthScores } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getNextDueDate, calculateHomeHealthScore } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";
import { z } from "zod";
import { apiHandler, parseBodyOrDefault } from "@/lib/api/handler";
import { completeTaskSchema } from "@/lib/api/schemas";
import { authorizeTaskAccess } from "@/lib/api/authorize";

export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/complete

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const task = await authorizeTaskAccess(parsed.data, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await parseBodyOrDefault(request, completeTaskSchema);
  const now = new Date();
  const completionDate = body.completedDate
    ? new Date(body.completedDate + "T12:00:00") // noon to avoid timezone issues
    : now;

  // Record completion
  await db.insert(taskCompletions).values({
    taskInstanceId: task.id,
    completedBy: user.id,
    completedAt: completionDate,
    isDiy: body.isDiy,
    costCents: body.costCents ?? null,
    timeSpentMinutes: body.timeSpentMinutes ?? null,
    notes: body.notes ?? null,
    skipped: false,
  });

  // Calculate next due date from the completion date
  const nextDue = getNextDueDate(
    task.frequencyValue,
    task.frequencyUnit as FrequencyUnit,
    completionDate
  );

  // For one_time tasks, deactivate instead of rescheduling
  const isOneTime = task.frequencyUnit === "one_time";

  await db
    .update(taskInstances)
    .set({
      lastCompletedDate: completionDate.toISOString().split("T")[0],
      nextDueDate: nextDue.toISOString().split("T")[0],
      isActive: isOneTime ? false : task.isActive,
      updatedAt: now,
    })
    .where(eq(taskInstances.id, parsed.data));

  // Recalculate health score immediately
  const allTasks = await db
    .select({
      nextDueDate: taskInstances.nextDueDate,
      priority: taskInstances.priority,
      lastCompletedDate: taskInstances.lastCompletedDate,
      isActive: taskInstances.isActive,
    })
    .from(taskInstances)
    .where(and(eq(taskInstances.homeId, task.homeId), eq(taskInstances.isActive, true)));

  const scoreData = allTasks.map((t) => ({
    nextDueDate: new Date(t.nextDueDate),
    priority: t.priority,
    lastCompletedDate: t.lastCompletedDate ? new Date(t.lastCompletedDate) : null,
    isActive: t.isActive ?? true,
  }));

  const newScore = calculateHomeHealthScore(scoreData);

  // Upsert the score
  await db.delete(homeHealthScores).where(eq(homeHealthScores.homeId, task.homeId));
  await db.insert(homeHealthScores).values({
    homeId: task.homeId,
    score: newScore.overall,
    criticalTasksScore: newScore.criticalTasks,
    preventiveCareScore: newScore.preventiveCare,
    homeEfficiencyScore: newScore.homeEfficiency,
    calculatedAt: new Date(),
  });

  return NextResponse.json({ success: true, nextDueDate: nextDue, deactivated: isOneTime });
});
