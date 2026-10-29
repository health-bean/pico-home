import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, taskCompletions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBodyOrDefault } from "@/lib/api/handler";
import { revertLastSchema } from "@/lib/api/schemas";
import { authorizeTaskAccess } from "@/lib/api/authorize";
import { recalculateHomeScore } from "@/lib/tasks/score-store";
import { planRevertLast, clientToday } from "@/lib/tasks/date-edit";
import type { FrequencyUnit } from "@/lib/tasks/templates";

/**
 * POST /api/tasks/[id]/revert-last
 *
 * Undo the task's most recent Complete or Skip at any time (the toast Undo
 * only lasts a few seconds). Rebuilds dates from the remaining history.
 */
export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/revert-last

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const task = await authorizeTaskAccess(parsed.data, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await parseBodyOrDefault(request, revertLastSchema);

  const completions = await db
    .select({
      id: taskCompletions.id,
      completedAt: taskCompletions.completedAt,
      createdAt: taskCompletions.createdAt,
      skipped: taskCompletions.skipped,
    })
    .from(taskCompletions)
    .where(eq(taskCompletions.taskInstanceId, task.id));

  const plan = planRevertLast(
    completions,
    { frequencyValue: task.frequencyValue, frequencyUnit: task.frequencyUnit as FrequencyUnit },
    clientToday(body.today)
  );
  if (!plan) {
    return NextResponse.json({ error: "Nothing to undo" }, { status: 404 });
  }

  await db.delete(taskCompletions).where(eq(taskCompletions.id, plan.deleteId));

  // Completing a one-time task retires it; undoing that brings it back.
  const reactivate = task.frequencyUnit === "one_time" && !task.dismissedAt;

  await db
    .update(taskInstances)
    .set({
      lastCompletedDate: plan.lastCompletedDate,
      nextDueDate: plan.nextDueDate,
      ...(reactivate ? { isActive: true } : {}),
      updatedAt: new Date(),
    })
    .where(eq(taskInstances.id, task.id));

  await recalculateHomeScore(task.homeId);

  return NextResponse.json({ success: true });
});
