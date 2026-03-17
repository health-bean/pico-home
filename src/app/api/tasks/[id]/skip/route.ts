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

  const [task] = await db
    .select()
    .from(taskInstances)
    .where(eq(taskInstances.id, id));

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
}
