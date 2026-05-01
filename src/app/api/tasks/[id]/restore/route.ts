import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { authorizeTaskAccess } from "@/lib/api/authorize";
import { getNextDueDate } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";

export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/restore

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const task = await authorizeTaskAccess(parsed.data, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Recalculate next due date from now
  const nextDue = getNextDueDate(
    task.frequencyValue,
    task.frequencyUnit as FrequencyUnit
  );

  await db
    .update(taskInstances)
    .set({
      isActive: true,
      dismissedAt: null,
      nextDueDate: nextDue.toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(taskInstances.id, parsed.data));

  return NextResponse.json({ success: true });
});
