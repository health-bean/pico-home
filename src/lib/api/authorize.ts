import { db } from "@/lib/db";
import { taskInstances, homeMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Verify that a task belongs to one of the user's homes.
 * Returns the task if authorized, null otherwise.
 */
export async function authorizeTaskAccess(taskId: string, userId: string) {
  const [task] = await db
    .select()
    .from(taskInstances)
    .where(eq(taskInstances.id, taskId));

  if (!task) return null;

  // Check that the user is a member of the home that owns this task
  const [membership] = await db
    .select()
    .from(homeMembers)
    .where(
      and(
        eq(homeMembers.homeId, task.homeId),
        eq(homeMembers.userId, userId)
      )
    );

  if (!membership) return null;

  return task;
}
