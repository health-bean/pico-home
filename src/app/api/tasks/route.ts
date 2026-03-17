import { NextResponse } from "next/server";
import { getAppUser } from "@/lib/auth/get-app-user";
import { db } from "@/lib/db";
import { homes, taskInstances, taskCompletions } from "@/lib/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [home] = await db
    .select()
    .from(homes)
    .where(eq(homes.userId, user.id))
    .limit(1);

  if (!home) {
    return NextResponse.json({ tasks: [] });
  }

  const tasks = await db
    .select()
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id))
    .orderBy(asc(taskInstances.nextDueDate));

  return NextResponse.json({ tasks, homeId: home.id });
}

// Create a custom task
export async function POST(request: Request) {
  const user = await getAppUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const [home] = await db
    .select()
    .from(homes)
    .where(eq(homes.userId, user.id))
    .limit(1);

  if (!home) {
    return NextResponse.json({ error: "No home found" }, { status: 400 });
  }

  const now = new Date();
  const dueDate = new Date(now);
  const freqValue = body.frequencyValue || 1;
  const freqUnit = body.frequencyUnit || "months";

  switch (freqUnit) {
    case "days": dueDate.setDate(dueDate.getDate() + freqValue); break;
    case "weeks": dueDate.setDate(dueDate.getDate() + freqValue * 7); break;
    case "months": dueDate.setMonth(dueDate.getMonth() + freqValue); break;
    case "years": dueDate.setFullYear(dueDate.getFullYear() + freqValue); break;
  }

  const [task] = await db
    .insert(taskInstances)
    .values({
      homeId: home.id,
      name: body.name,
      description: body.description || null,
      category: body.category || "seasonal",
      priority: body.priority || "efficiency",
      frequencyUnit: freqUnit,
      frequencyValue: freqValue,
      nextDueDate: dueDate.toISOString().split("T")[0],
      isActive: true,
      isCustom: true,
      notificationDaysBefore: 3,
      notes: body.notes || null,
    })
    .returning();

  return NextResponse.json({ task });
}
