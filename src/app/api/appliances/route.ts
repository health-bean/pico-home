import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appliances, taskInstances } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { getUserHome } from "@/lib/auth/get-user-home";
import { adjustFrequencyForHealth, getApplicableTemplates } from "@/lib/tasks/scheduling";
import { loadHomeForMatching } from "@/lib/tasks/home-matching";
import { getInitialDueDate } from "@/lib/tasks/initial-due";
import { revivedDueDate, tasksToRetire, withoutOne } from "@/lib/tasks/retire";
import type { ApplianceCategory, FrequencyUnit } from "@/lib/tasks/templates";

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

  // Match against the whole home (systems, climate, household options)
  const { matching, healthFlags } = await loadHomeForMatching(home);
  const existingTasks = await db
    .select({
      id: taskInstances.id,
      name: taskInstances.name,
      isActive: taskInstances.isActive,
      dismissedAt: taskInstances.dismissedAt,
      nextDueDate: taskInstances.nextDueDate,
      frequencyValue: taskInstances.frequencyValue,
      frequencyUnit: taskInstances.frequencyUnit,
    })
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id));
  const existingTaskNames = new Set(existingTasks.map(t => t.name));

  const newTasks = getApplicableTemplates(matching, healthFlags)
    .filter(t => !existingTaskNames.has(t.name))
    .filter(t => t.applicableApplianceCategories.includes(body.category as ApplianceCategory))
    .map(t => {
      const freq = adjustFrequencyForHealth(t.frequencyValue, t.frequencyUnit, t.healthMultipliers, healthFlags);
      return {
        homeId: home.id,
        name: t.name,
        description: t.description,
        category: t.category,
        priority: t.priority,
        frequencyUnit: freq.frequencyUnit,
        frequencyValue: freq.frequencyValue,
        // Same staggered/seasonal first due date as onboarding — never today + frequency
        nextDueDate: getInitialDueDate(t, freq.frequencyValue, freq.frequencyUnit as FrequencyUnit).toISOString().split("T")[0],
        lastCompletedDate: null,
        isActive: true,
        isCustom: false,
        notificationDaysBefore: 3,
        tips: t.tips,
        whyItMatters: t.whyItMatters,
        subgroup: t.subgroup,
        applianceId: appliance.id,
      };
    });

  if (newTasks.length > 0) {
    await db.insert(taskInstances).values(newTasks);
  }

  // Re-adding something brings back the tasks its removal dismissed. A due
  // date that went stale while removed is rescheduled like a new task.
  const relevant = new Map(
    getApplicableTemplates(matching, healthFlags)
      .filter(t => t.applicableApplianceCategories.includes(body.category as ApplianceCategory))
      .map(t => [t.name, t])
  );
  const revive = existingTasks.filter(t => !t.isActive && t.dismissedAt && relevant.has(t.name));
  if (revive.length > 0) {
    await db.transaction(async (tx) => {
      for (const t of revive) {
        await tx
          .update(taskInstances)
          .set({
            isActive: true,
            dismissedAt: null,
            nextDueDate: revivedDueDate(t.nextDueDate, relevant.get(t.name)!, t.frequencyValue, t.frequencyUnit as FrequencyUnit),
            updatedAt: new Date(),
          })
          .where(eq(taskInstances.id, t.id));
      }
    });
  }

  return NextResponse.json({ success: true, applianceId: appliance.id, tasksCreated: newTasks.length, tasksRestored: revive.length });
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

  // Tasks that only applied because of this appliance go to Dismissed
  // (restorable from Tasks), so the plan matches the profile.
  const { matching, healthFlags } = await loadHomeForMatching(home);
  const after = appliance.category
    ? { ...matching, appliances: withoutOne(matching.appliances, appliance.category as ApplianceCategory) }
    : matching;
  const homeTasks = await db
    .select({ id: taskInstances.id, name: taskInstances.name, isCustom: taskInstances.isCustom, isActive: taskInstances.isActive })
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id));
  const retireIds = tasksToRetire(matching, after, healthFlags, homeTasks);

  await db.transaction(async (tx) => {
    await tx.delete(appliances).where(eq(appliances.id, body.id));
    if (retireIds.length > 0) {
      await tx
        .update(taskInstances)
        .set({ isActive: false, dismissedAt: new Date(), updatedAt: new Date() })
        .where(inArray(taskInstances.id, retireIds));
    }
  });

  return NextResponse.json({ success: true, tasksRemoved: retireIds.length });
});
