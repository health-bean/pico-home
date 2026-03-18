import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, parseBodyOrDefault } from "@/lib/api/handler";
import { snoozeTaskSchema } from "@/lib/api/schemas";
import { authorizeTaskAccess } from "@/lib/api/authorize";

export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/snooze

  const task = await authorizeTaskAccess(id, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await parseBodyOrDefault(request, snoozeTaskSchema);

  const currentDue = new Date(task.nextDueDate);
  currentDue.setDate(currentDue.getDate() + body.days);

  await db
    .update(taskInstances)
    .set({
      nextDueDate: currentDue.toISOString().split("T")[0],
      updatedAt: new Date(),
    })
    .where(eq(taskInstances.id, id));

  return NextResponse.json({ success: true, nextDueDate: currentDue });
});
