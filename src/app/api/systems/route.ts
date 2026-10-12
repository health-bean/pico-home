import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeSystems, taskInstances } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { getUserHome } from "@/lib/auth/get-user-home";
import { adjustFrequencyForHealth, getApplicableTemplates } from "@/lib/tasks/scheduling";
import { loadHomeForMatching } from "@/lib/tasks/home-matching";
import { getInitialDueDate } from "@/lib/tasks/initial-due";
import { tasksToRetire, withoutOne } from "@/lib/tasks/retire";
import type { SystemType, FrequencyUnit } from "@/lib/tasks/templates";

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

  // Match against the whole home (systems, climate, household options)
  const { matching, healthFlags } = await loadHomeForMatching(home);
  const existingTasks = await db
    .select({ id: taskInstances.id, name: taskInstances.name, isActive: taskInstances.isActive, dismissedAt: taskInstances.dismissedAt })
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id));
  const existingTaskNames = new Set(existingTasks.map(t => t.name));

  const newTasks = getApplicableTemplates(matching, healthFlags)
    .filter(t => !existingTaskNames.has(t.name))
    .filter(t => t.applicableSystems.includes(body.systemType as SystemType))
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
      };
    });

  if (newTasks.length > 0) {
    await db.insert(taskInstances).values(newTasks);
  }

  // Re-adding something brings back the tasks its removal dismissed
  const relevantNames = new Set(
    getApplicableTemplates(matching, healthFlags)
      .filter(t => t.applicableSystems.includes(body.systemType as SystemType))
      .map(t => t.name)
  );
  const reviveIds = existingTasks
    .filter(t => !t.isActive && t.dismissedAt && relevantNames.has(t.name))
    .map(t => t.id);
  if (reviveIds.length > 0) {
    await db
      .update(taskInstances)
      .set({ isActive: true, dismissedAt: null, updatedAt: new Date() })
      .where(inArray(taskInstances.id, reviveIds));
  }

  return NextResponse.json({ success: true, systemId: system.id, tasksCreated: newTasks.length, tasksRestored: reviveIds.length });
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

  // Tasks that only applied because of this system go to Dismissed
  // (restorable from Tasks), so the plan matches the profile.
  const { matching, healthFlags } = await loadHomeForMatching(home);
  const type = system.systemType as SystemType;
  const remainingSubtypes = withoutOne(matching.systemSubtypes[type] ?? [], system.subtype ?? "standard");
  const after = {
    ...matching,
    systems: withoutOne(matching.systems, type),
    systemSubtypes: { ...matching.systemSubtypes, [type]: remainingSubtypes.length ? remainingSubtypes : undefined },
  };
  const homeTasks = await db
    .select({ id: taskInstances.id, name: taskInstances.name, isCustom: taskInstances.isCustom, isActive: taskInstances.isActive })
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id));
  const retireIds = tasksToRetire(matching, after, healthFlags, homeTasks);

  await db.transaction(async (tx) => {
    await tx.delete(homeSystems).where(eq(homeSystems.id, body.id));
    if (retireIds.length > 0) {
      await tx
        .update(taskInstances)
        .set({ isActive: false, dismissedAt: new Date(), updatedAt: new Date() })
        .where(inArray(taskInstances.id, retireIds));
    }
  });

  return NextResponse.json({ success: true, tasksRemoved: retireIds.length });
});
