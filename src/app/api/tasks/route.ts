import { NextResponse } from "next/server";
import { getUserHome } from "@/lib/auth/get-user-home";
import { db } from "@/lib/db";
import { taskInstances } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { createTaskSchema } from "@/lib/api/schemas";

export const GET = apiHandler(async ({ user, request }) => {
  const { searchParams } = new URL(request.url);
  const homeId = searchParams.get("homeId") ?? undefined;
  const home = await getUserHome(user.id, homeId);

  if (!home) {
    return NextResponse.json({ tasks: [] });
  }

  // Pagination
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 1),
    200
  );
  const offset = Math.max(
    parseInt(searchParams.get("offset") ?? "0", 10) || 0,
    0
  );

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

  return NextResponse.json({ tasks, homeId: home.id, total: count, limit, offset });
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
