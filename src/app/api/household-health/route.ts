import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { householdHealthFlags, taskInstances } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { apiHandler, parseBody } from "@/lib/api/handler";
import { householdHealthSchema } from "@/lib/api/schemas";
import { getUserHome } from "@/lib/auth/get-user-home";
import { TASK_TEMPLATES } from "@/lib/tasks/templates";
import { adjustFrequencyForHealth, type HealthFlags } from "@/lib/tasks/scheduling";
import type { FrequencyUnit } from "@/lib/tasks/templates";

const FLAG_KEYS = [
  "hasAllergies",
  "hasYoungChildren",
  "hasPets",
  "hasElderly",
  "hasImmunocompromised",
  "prioritizeAirQuality",
  "prioritizeEnergyEfficiency",
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

  await db
    .insert(householdHealthFlags)
    .values({ homeId: home.id, ...body })
    .onConflictDoUpdate({
      target: householdHealthFlags.homeId,
      set: { ...body, updatedAt: new Date() },
    });

  // Re-adjust cadence for template-generated tasks (matched by name — the
  // de-facto key until template_id lands). Due dates stay put; the new
  // frequency applies from each task's next completion.
  const flags: HealthFlags = body;
  const templatesByName = new Map(TASK_TEMPLATES.map((t) => [t.name, t]));
  const activeTasks = await db
    .select({
      id: taskInstances.id,
      name: taskInstances.name,
      frequencyValue: taskInstances.frequencyValue,
      frequencyUnit: taskInstances.frequencyUnit,
    })
    .from(taskInstances)
    .where(
      and(
        eq(taskInstances.homeId, home.id),
        eq(taskInstances.isActive, true),
        eq(taskInstances.isCustom, false)
      )
    );

  let adjusted = 0;
  for (const task of activeTasks) {
    const template = templatesByName.get(task.name);
    if (!template) continue;
    const next = adjustFrequencyForHealth(
      template.frequencyValue,
      template.frequencyUnit,
      template.healthMultipliers,
      flags
    );
    if (
      next.frequencyValue !== task.frequencyValue ||
      next.frequencyUnit !== (task.frequencyUnit as FrequencyUnit)
    ) {
      await db
        .update(taskInstances)
        .set({
          frequencyValue: next.frequencyValue,
          frequencyUnit: next.frequencyUnit,
          updatedAt: new Date(),
        })
        .where(eq(taskInstances.id, task.id));
      adjusted++;
    }
  }

  const result: Record<string, boolean | number> = { tasksAdjusted: adjusted };
  for (const key of FLAG_KEYS) result[key] = body[key] ?? false;
  return NextResponse.json(result);
});
