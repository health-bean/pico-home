import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, taskCompletions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getNextDueDate } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { authorizeTaskAccess } from "@/lib/api/authorize";

export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/skip

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const task = await authorizeTaskAccess(parsed.data, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const now = new Date();

  // Snapshot pre-action state for the undo token
  const previous = {
    nextDueDate: task.nextDueDate,
    lastCompletedDate: task.lastCompletedDate,
    isActive: task.isActive ?? true,
  };

  // Record skip
  const [completion] = await db.insert(taskCompletions).values({
    taskInstanceId: task.id,
    completedBy: user.id,
    completedAt: now,
    skipped: true,
    isDiy: true,
  }).returning({ id: taskCompletions.id });

  // Move to next due date (same as completing)
  const nextDue = getNextDueDate(
    task.frequencyValue,
    task.frequencyUnit as FrequencyUnit,
    now
  );

  await db
    .update(taskInstances)
    .set({
      nextDueDate: nextDue.toISOString().split("T")[0],
      updatedAt: now,
    })
    .where(eq(taskInstances.id, parsed.data));

  return NextResponse.json({
    success: true,
    nextDueDate: nextDue,
    undo: {
      completionId: completion.id,
      previousNextDueDate: previous.nextDueDate,
      previousLastCompletedDate: previous.lastCompletedDate,
      previousIsActive: previous.isActive,
    },
  });
});
