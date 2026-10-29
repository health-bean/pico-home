import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { taskCompletions, taskInstances, users } from "@/lib/db/schema";
import { asc, eq, sql } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { parsePagination } from "@/lib/api/pagination";
import { createTaskSchema } from "@/lib/api/schemas";

export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = searchParams.get("homeId") ?? undefined;
  const home = await getUserHome(user.id, homeId);

  if (!home) {
    return NextResponse.json({ tasks: [] });
  }

  // Pagination — default sized to never truncate a full home task list
  const { limit, offset } = parsePagination(searchParams);

  const tasks = await db
    .select()
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id))
    .orderBy(asc(taskInstances.nextDueDate))
    .limit(limit)
    .offset(offset);

  // Get total count for pagination metadata
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id));

  // Attribution (most recent real completer) and the last recorded action
  // (Complete or Skip), which the task dialog can revert at any time.
  const completionRows = await db
    .select({
      taskInstanceId: taskCompletions.taskInstanceId,
      name: users.name,
      completedAt: taskCompletions.completedAt,
      createdAt: taskCompletions.createdAt,
      skipped: taskCompletions.skipped,
    })
    .from(taskCompletions)
    .leftJoin(users, eq(taskCompletions.completedBy, users.id))
    .innerJoin(taskInstances, eq(taskCompletions.taskInstanceId, taskInstances.id))
    .where(eq(taskInstances.homeId, home.id));

  const lastCompletedByTask = new Map<string, { name: string | null; at: Date }>();
  const lastActionByTask = new Map<
    string,
    { type: "completed" | "skipped"; date: string; by: string | null; createdAt: Date }
  >();
  for (const row of completionRows) {
    if (!row.skipped) {
      const prev = lastCompletedByTask.get(row.taskInstanceId);
      if (!prev || row.completedAt > prev.at) {
        lastCompletedByTask.set(row.taskInstanceId, { name: row.name, at: row.completedAt });
      }
    }
    const prevAction = lastActionByTask.get(row.taskInstanceId);
    if (!prevAction || row.createdAt > prevAction.createdAt) {
      lastActionByTask.set(row.taskInstanceId, {
        type: row.skipped ? "skipped" : "completed",
        date: row.completedAt.toISOString().slice(0, 10),
        by: row.name,
        createdAt: row.createdAt,
      });
    }
  }
  const tasksWithAttribution = tasks.map((t) => {
    const action = lastActionByTask.get(t.id);
    return {
      ...t,
      lastCompletedBy: lastCompletedByTask.get(t.id)?.name ?? null,
      lastAction: action ? { type: action.type, date: action.date, by: action.by } : null,
    };
  });

  return NextResponse.json({ tasks: tasksWithAttribution, homeId: home.id, total: count, limit, offset });
});

export const POST = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, createTaskSchema);
  const home = await getUserHome(user.id, body.homeId);

  if (!home) {
    return NextResponse.json({ error: "No home found" }, { status: 400 });
  }

  const now = new Date();
  const dueDate = new Date(now);

  switch (body.frequencyUnit) {
    case "days":
      dueDate.setDate(dueDate.getDate() + body.frequencyValue);
      break;
    case "weeks":
      dueDate.setDate(dueDate.getDate() + body.frequencyValue * 7);
      break;
    case "months":
      dueDate.setMonth(dueDate.getMonth() + body.frequencyValue);
      break;
    case "years":
      dueDate.setFullYear(dueDate.getFullYear() + body.frequencyValue);
      break;
    case "one_time":
      // One-time tasks: due based on the frequency value in days
      dueDate.setDate(dueDate.getDate() + body.frequencyValue);
      break;
  }

  const [task] = await db
    .insert(taskInstances)
    .values({
      homeId: home.id,
      name: body.name,
      description: body.description || null,
      category: body.category,
      priority: body.priority,
      frequencyUnit: body.frequencyUnit,
      frequencyValue: body.frequencyValue,
      nextDueDate: dueDate.toISOString().split("T")[0],
      isActive: true,
      isCustom: true,
      notificationDaysBefore: 3,
      notes: body.notes || null,
    })
    .returning();

  return NextResponse.json({ task });
});
