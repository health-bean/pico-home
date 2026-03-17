import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { db } from "@/lib/db";
import { taskInstances, taskCompletions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getNextDueDate } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const [task] = await db
    .select()
    .from(taskInstances)
    .where(eq(taskInstances.id, id));

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const now = new Date();

  // Record completion
  await db.insert(taskCompletions).values({
    taskInstanceId: task.id,
    completedBy: user.id,
    completedAt: now,
    isDiy: body.isDiy ?? true,
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

  // Update task instance
  await db
    .update(taskInstances)
    .set({
      lastCompletedDate: now.toISOString().split("T")[0],
      nextDueDate: nextDue.toISOString().split("T")[0],
      updatedAt: now,
    })
    .where(eq(taskInstances.id, id));

  return NextResponse.json({ success: true, nextDueDate: nextDue });
}
