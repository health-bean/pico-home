import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { taskInstances, homeHealthScores } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { calculateHomeHealthScore } from "@/lib/tasks/scheduling";
import { verifyCronAuth } from "@/lib/api/cron-auth";

/**
 * POST /api/health-score
 *
 * Cron endpoint that precomputes home health scores for all homes
 * with active task instances. Runs daily at 6am, before push notifications.
 * Secured via CRON_SECRET bearer token.
 */
export async function POST(request: Request) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  // Get all distinct home IDs that have active task instances
  const homesWithTasks = await db
    .selectDistinct({ homeId: taskInstances.homeId })
    .from(taskInstances)
    .where(eq(taskInstances.isActive, true));

  let homesUpdated = 0;

  for (const { homeId } of homesWithTasks) {
    // Fetch active tasks for this home
    const tasks = await db
      .select({
        nextDueDate: taskInstances.nextDueDate,
        priority: taskInstances.priority,
        lastCompletedDate: taskInstances.lastCompletedDate,
        isActive: taskInstances.isActive,
      })
      .from(taskInstances)
      .where(eq(taskInstances.homeId, homeId));

    const activeTasks = tasks
      .filter((t) => t.isActive)
      .map((t) => ({
        nextDueDate: new Date(t.nextDueDate),
        priority: t.priority,
        lastCompletedDate: t.lastCompletedDate
          ? new Date(t.lastCompletedDate)
          : null,
        isActive: t.isActive ?? true,
      }));

    const score = calculateHomeHealthScore(activeTasks);

    // Upsert: delete existing score for this home, then insert fresh one
    await db.transaction(async (tx) => {
      await tx
        .delete(homeHealthScores)
        .where(eq(homeHealthScores.homeId, homeId));

      await tx.insert(homeHealthScores).values({
        homeId,
        score: score.overall,
        criticalTasksScore: score.criticalTasks,
        preventiveCareScore: score.preventiveCare,
        homeEfficiencyScore: score.homeEfficiency,
        calculatedAt: new Date(),
      });
    });

    homesUpdated++;
  }

  return NextResponse.json({ success: true, homesUpdated });
}
