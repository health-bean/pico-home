import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, taskCompletions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getNextDueDate } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";
import { apiHandler } from "@/lib/api/handler";
import { authorizeTaskAccess } from "@/lib/api/authorize";

export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/skip

  const task = await authorizeTaskAccess(id, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const now = new Date();

  // Record skip
  await db.insert(taskCompletions).values({
    taskInstanceId: task.id,
    completedBy: user.id,
    completedAt: now,
    skipped: true,
    isDiy: true,
  });

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
    .where(eq(taskInstances.id, id));

  return NextResponse.json({ success: true, nextDueDate: nextDue });
});
