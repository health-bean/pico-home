import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appliances, homeSystems, taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { getUserHome } from "@/lib/auth/get-user-home";
import { getApplicableTemplates, getNextDueDate } from "@/lib/tasks/scheduling";
import type { HomeType, SystemType, ApplianceCategory, FrequencyUnit } from "@/lib/tasks/templates";

const addApplianceSchema = z.object({
  homeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(50),
});

const deleteApplianceSchema = z.object({
  id: z.string().uuid(),
});

export const POST = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, addApplianceSchema);

  const home = await getUserHome(user.id, body.homeId);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  const [appliance] = await db.insert(appliances).values({
    homeId: home.id,
    name: body.name,
    category: body.category as ApplianceCategory,
  }).returning();

  // Get existing data for template matching
  const existingSystems = await db.select().from(homeSystems).where(eq(homeSystems.homeId, home.id));
  const existingAppls = await db.select().from(appliances).where(eq(appliances.homeId, home.id));
  const existingTasks = await db.select({ name: taskInstances.name }).from(taskInstances).where(eq(taskInstances.homeId, home.id));
  const existingTaskNames = new Set(existingTasks.map(t => t.name));

  const applicableTemplates = getApplicableTemplates(
    {
      type: (home.type || "single_family") as HomeType,
      systems: existingSystems.map(s => s.systemType as SystemType),
      appliances: existingAppls.map(a => a.category as ApplianceCategory),
    },
    {}
  );

  const newTasks = applicableTemplates
    .filter(t => !existingTaskNames.has(t.name))
    .filter(t => t.applicableApplianceCategories.includes(body.category as ApplianceCategory))
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

  return NextResponse.json({ success: true, applianceId: appliance.id, tasksCreated: newTasks.length });
});

export const DELETE = apiHandler(async ({ user, request }) => {
  const body = await parseBody(request, deleteApplianceSchema);

  const [appliance] = await db.select().from(appliances).where(eq(appliances.id, body.id));
  if (!appliance) {
    return NextResponse.json({ error: "Appliance not found" }, { status: 404 });
  }

  const home = await getUserHome(user.id, appliance.homeId);
  if (!home) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(appliances).where(eq(appliances.id, body.id));

  return NextResponse.json({ success: true });
});
