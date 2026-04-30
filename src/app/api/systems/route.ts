import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeSystems, taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { getUserHome } from "@/lib/auth/get-user-home";
import { getApplicableTemplates, getNextDueDate } from "@/lib/tasks/scheduling";
import type { SystemType, HomeType, ApplianceCategory, FrequencyUnit } from "@/lib/tasks/templates";
import { appliances } from "@/lib/db/schema";

const addSystemSchema = z.object({
  homeId: z.string().uuid(),
  systemType: z.string().min(1).max(50),
  subtype: z.string().max(100).default("standard"),
});

const deleteSystemSchema = z.object({
  id: z.string().uuid(),
});

export const POST = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, addSystemSchema);

  const home = await getUserHome(user.id, body.homeId);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  // Add the system
  const [system] = await db.insert(homeSystems).values({
    homeId: home.id,
    systemType: body.systemType as SystemType,
    subtype: body.subtype,
  }).returning();

  // Get existing systems and appliances to find NEW applicable templates
  const existingSystems = await db.select().from(homeSystems).where(eq(homeSystems.homeId, home.id));
  const systemTypes = existingSystems.map(s => s.systemType as SystemType);

  const existingAppls = await db.select().from(appliances).where(eq(appliances.homeId, home.id));

  // Get existing task names to avoid duplicates
  const existingTasks = await db.select({ name: taskInstances.name }).from(taskInstances).where(eq(taskInstances.homeId, home.id));
  const existingTaskNames = new Set(existingTasks.map(t => t.name));

  // Find templates that apply with the new system
  const applicableTemplates = getApplicableTemplates(
    {
      type: (home.type || "single_family") as HomeType,
      systems: systemTypes,
      appliances: existingAppls.map(a => a.category as ApplianceCategory),
    },
    {}
  );

  // Create tasks for new templates that don't already exist
  const newTasks = applicableTemplates
    .filter(t => !existingTaskNames.has(t.name))
    .filter(t => t.applicableSystems.includes(body.systemType as SystemType))
    .map(t => ({
      homeId: home.id,
      name: t.name,
      description: t.description,
      category: t.category,
      priority: t.priority,
      frequencyUnit: t.frequencyUnit,
      frequencyValue: t.frequencyValue,
      nextDueDate: getNextDueDate(t.frequencyValue, t.frequencyUnit as FrequencyUnit).toISOString().split("T")[0],
      lastCompletedDate: null,
      isActive: true,
      isCustom: false,
      notificationDaysBefore: 3,
    }));

  if (newTasks.length > 0) {
    await db.insert(taskInstances).values(newTasks);
  }

  return NextResponse.json({ success: true, systemId: system.id, tasksCreated: newTasks.length });
});

export const DELETE = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, deleteSystemSchema);

  // Verify the system exists and user has access
  const [system] = await db.select().from(homeSystems).where(eq(homeSystems.id, body.id));
  if (!system) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  const home = await getUserHome(user.id, system.homeId);
  if (!home) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(homeSystems).where(eq(homeSystems.id, body.id));

  return NextResponse.json({ success: true });
});
