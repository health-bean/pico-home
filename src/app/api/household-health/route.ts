import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdHealthFlags, taskInstances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { householdHealthSchema } from "@/lib/api/schemas";
import { getUserHome } from "@/lib/auth/get-user-home";
import { TASK_TEMPLATES } from "@/lib/tasks/templates";
import {
  adjustFrequencyForHealth,
  healthTasksToAdd,
  retimeForHealthChange,
  type HealthFlags,
} from "@/lib/tasks/scheduling";
import { getInitialDueDate } from "@/lib/tasks/initial-due";
import { loadHomeForMatching } from "@/lib/tasks/home-matching";
import type { FrequencyUnit } from "@/lib/tasks/templates";

const FLAG_KEYS = [
  "hasAllergies",
  "hasYoungChildren",
  "hasPets",
  "hasElderly",
  "hasImmunocompromised",
  "prioritizeAirQuality",
  "prioritizeEnergyEfficiency",
  "moldSensitive",
] as const;

export const GET = apiHandler(async ({ user }) => {
  const home = await getUserHome(user.id);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  const [flags] = await db
    .select()
    .from(householdHealthFlags)
    .where(eq(householdHealthFlags.homeId, home.id));

  const result: Record<string, boolean> = {};
  for (const key of FLAG_KEYS) {
    result[key] = (flags?.[key] as boolean | null) ?? false;
  }
  return NextResponse.json(result);
});

export const PUT = apiHandler(async ({ user, request }) => {
  const home = await getUserHome(user.id);
  if (!home) {
    return NextResponse.json({ error: "Home not found" }, { status: 404 });
  }

  const body = await parseBody(request, householdHealthSchema);

  // Old options first: they tell us which frequencies are still Pico's
  // defaults (safe to re-time) versus edited by the user (left alone)
  const { matching, healthFlags: oldFlags } = await loadHomeForMatching(home);

  await db
    .insert(householdHealthFlags)
    .values({ homeId: home.id, ...body })
    .onConflictDoUpdate({
      target: householdHealthFlags.homeId,
      set: { ...body, updatedAt: new Date() },
    });

  // Re-time template-generated tasks (matched by name — the de-facto key
  // until template_id lands). Due dates stay put; the new frequency applies
  // from each task's next completion.
  const flags: HealthFlags = body;
  const templatesByName = new Map(TASK_TEMPLATES.map((t) => [t.name, t]));
  const homeTasks = await db
    .select({
      id: taskInstances.id,
      name: taskInstances.name,
      isActive: taskInstances.isActive,
      isCustom: taskInstances.isCustom,
      frequencyValue: taskInstances.frequencyValue,
      frequencyUnit: taskInstances.frequencyUnit,
    })
    .from(taskInstances)
    .where(eq(taskInstances.homeId, home.id));

  let adjusted = 0;
  for (const task of homeTasks) {
    if (!task.isActive || task.isCustom) continue;
    const template = templatesByName.get(task.name);
    if (!template) continue;
    const next = retimeForHealthChange(
      template,
      { frequencyValue: task.frequencyValue, frequencyUnit: task.frequencyUnit as FrequencyUnit },
      oldFlags,
      flags
    );
    if (next) {
      await db
        .update(taskInstances)
        .set({ ...next, updatedAt: new Date() })
        .where(eq(taskInstances.id, task.id));
      adjusted++;
    }
  }

  // Newly ticked options switch on their own tasks (e.g. Mold sensitivity →
  // mold inspection). Names already on the home — dismissed included — are
  // skipped, so nothing is revived or duplicated.
  const toAdd = healthTasksToAdd(matching, new Set(homeTasks.map((t) => t.name)), flags);
  if (toAdd.length > 0) {
    await db.insert(taskInstances).values(
      toAdd.map((t) => {
        const freq = adjustFrequencyForHealth(t.frequencyValue, t.frequencyUnit, t.healthMultipliers, flags);
        return {
          homeId: home.id,
          name: t.name,
          description: t.description,
          category: t.category,
          priority: t.priority,
          frequencyUnit: freq.frequencyUnit,
          frequencyValue: freq.frequencyValue,
          nextDueDate: getInitialDueDate(t, freq.frequencyValue, freq.frequencyUnit).toISOString().split("T")[0],
          lastCompletedDate: null,
          isActive: true,
          isCustom: false,
          notificationDaysBefore: 3,
          tips: t.tips,
          whyItMatters: t.whyItMatters,
          subgroup: t.subgroup,
        };
      })
    );
  }

  const result: Record<string, boolean | number> = { tasksAdjusted: adjusted, tasksAdded: toAdd.length };
  for (const key of FLAG_KEYS) result[key] = body[key] ?? false;
  return NextResponse.json(result);
});
