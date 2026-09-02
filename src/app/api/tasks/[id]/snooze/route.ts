import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBodyOrDefault } from "@/lib/api/handler";
import { snoozeBaseDate } from "@/lib/tasks/scheduling";
import { snoozeTaskSchema } from "@/lib/api/schemas";
import { authorizeTaskAccess } from "@/lib/api/authorize";

export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/snooze

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const task = await authorizeTaskAccess(parsed.data, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await parseBodyOrDefault(request, snoozeTaskSchema);

  // Overdue tasks snooze from today ("remind me in N days"), future tasks
  // from their due date.
  const newDue = snoozeBaseDate(task.nextDueDate);
  newDue.setDate(newDue.getDate() + body.days);

  await db
    .update(taskInstances)
    .set({
      nextDueDate: newDue.toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(taskInstances.id, parsed.data));

  return NextResponse.json({ success: true, nextDueDate: newDue });
});
