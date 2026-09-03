import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { taskCompletions, taskInstances, users } from "@/lib/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
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

  // Attribution: most recent real (non-skipped) completer per task
  const completerRows = await db
    .select({
      taskInstanceId: taskCompletions.taskInstanceId,
      name: users.name,
      completedAt: taskCompletions.completedAt,
    })
    .from(taskCompletions)
    .innerJoin(users, eq(taskCompletions.completedBy, users.id))
    .innerJoin(taskInstances, eq(taskCompletions.taskInstanceId, taskInstances.id))
    .where(and(eq(taskInstances.homeId, home.id), eq(taskCompletions.skipped, false)))
    .orderBy(desc(taskCompletions.completedAt));
  const lastCompletedByTask = new Map<string, string | null>();
  for (const row of completerRows) {
    if (!lastCompletedByTask.has(row.taskInstanceId)) {
      lastCompletedByTask.set(row.taskInstanceId, row.name);
    }
  }
  const tasksWithAttribution = tasks.map((t) => ({
    ...t,
    lastCompletedBy: lastCompletedByTask.get(t.id) ?? null,
  }));

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
