import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, taskCompletions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getNextDueDate } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";
import { apiHandler, parseBodyOrDefault } from "@/lib/api/handler";
import { completeTaskSchema } from "@/lib/api/schemas";
import { authorizeTaskAccess } from "@/lib/api/authorize";

export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/complete

  const task = await authorizeTaskAccess(id, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await parseBodyOrDefault(request, completeTaskSchema);
  const now = new Date();

  // Record completion
  await db.insert(taskCompletions).values({
    taskInstanceId: task.id,
    completedBy: user.id,
    completedAt: now,
    isDiy: body.isDiy,
    costCents: body.costCents ?? null,
    timeSpentMinutes: body.timeSpentMinutes ?? null,
    notes: body.notes ?? null,
    skipped: false,
  });

  // Calculate next due date
  const nextDue = getNextDueDate(
    task.frequencyValue,
    task.frequencyUnit as FrequencyUnit,
    now
  );

  // For one_time tasks, deactivate instead of rescheduling
  const isOneTime = task.frequencyUnit === "one_time";

  await db
    .update(taskInstances)
    .set({
      lastCompletedDate: now.toISOString().split("T")[0],
      nextDueDate: nextDue.toISOString().split("T")[0],
      isActive: isOneTime ? false : task.isActive,
      updatedAt: now,
    })
    .where(eq(taskInstances.id, id));

  return NextResponse.json({ success: true, nextDueDate: nextDue, deactivated: isOneTime });
});
