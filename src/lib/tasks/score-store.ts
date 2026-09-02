import { db } from "@/lib/db";
import { taskInstances, homeHealthScores } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { calculateHomeHealthScore } from "./scheduling";

/**
 * Recalculate a home's maintenance score from its active tasks and upsert
 * the stored row. Shared by the complete, undo, and cron paths.
 */
export async function recalculateHomeScore(homeId: string) {
  const allTasks = await db
    .select({
      nextDueDate: taskInstances.nextDueDate,
      priority: taskInstances.priority,
      lastCompletedDate: taskInstances.lastCompletedDate,
      isActive: taskInstances.isActive,
      frequencyValue: taskInstances.frequencyValue,
      frequencyUnit: taskInstances.frequencyUnit,
    })
    .from(taskInstances)
    .where(and(eq(taskInstances.homeId, homeId), eq(taskInstances.isActive, true)));

  const newScore = calculateHomeHealthScore(
    allTasks.map((t) => ({
      nextDueDate: new Date(t.nextDueDate),
      priority: t.priority,
      lastCompletedDate: t.lastCompletedDate ? new Date(t.lastCompletedDate) : null,
      isActive: t.isActive ?? true,
      frequencyValue: t.frequencyValue,
      frequencyUnit: t.frequencyUnit,
    }))
  );

  await db.delete(homeHealthScores).where(eq(homeHealthScores.homeId, homeId));
  await db.insert(homeHealthScores).values({
    homeId,
    score: newScore.overall,
    criticalTasksScore: newScore.criticalTasks,
    preventiveCareScore: newScore.preventiveCare,
    homeEfficiencyScore: newScore.homeEfficiency,
    calculatedAt: new Date(),
  });

  return newScore;
}
