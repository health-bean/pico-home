import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, taskCompletions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { undoTaskSchema } from "@/lib/api/schemas";
import { authorizeTaskAccess } from "@/lib/api/authorize";
import { recalculateHomeScore } from "@/lib/tasks/score-store";

/**
 * POST /api/tasks/[id]/undo
 *
 * Reverts a complete or skip: deletes the completion row and restores the
 * task's pre-action state from the undo token the action response returned.
 * The token only ever touches the caller's own home (membership verified),
 * matching the trust level of the PATCH edit endpoint.
 */
export const POST = apiHandler(async ({ user, request }) => {
  const url = new URL(request.url);
  const id = url.pathname.split("/").at(-2)!; // /api/tasks/[id]/undo

  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
  }

  const task = await authorizeTaskAccess(parsed.data, user.id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const body = await parseBody(request, undoTaskSchema);

  const [completion] = await db
    .select({ id: taskCompletions.id })
    .from(taskCompletions)
    .where(
      and(
        eq(taskCompletions.id, body.completionId),
        eq(taskCompletions.taskInstanceId, task.id)
      )
    );

  if (!completion) {
    return NextResponse.json({ error: "Nothing to undo" }, { status: 404 });
  }

  await db.delete(taskCompletions).where(eq(taskCompletions.id, completion.id));

  await db
    .update(taskInstances)
    .set({
      nextDueDate: body.previousNextDueDate,
      lastCompletedDate: body.previousLastCompletedDate,
      isActive: body.previousIsActive,
      updatedAt: new Date(),
    })
    .where(eq(taskInstances.id, task.id));

  await recalculateHomeScore(task.homeId);

  return NextResponse.json({ success: true });
});
