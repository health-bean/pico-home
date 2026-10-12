import { getApplicableTemplates, type HealthFlags } from "./scheduling";
import { getInitialDueDate } from "./initial-due";
import type { FrequencyUnit, TaskTemplate } from "./templates";

type HomeMatching = Parameters<typeof getApplicableTemplates>[0];

/** Drop one occurrence of `value` — a home can have two fridges. */
export function withoutOne<T>(list: T[], value: T): T[] {
  const i = list.indexOf(value);
  return i === -1 ? list : [...list.slice(0, i), ...list.slice(i + 1)];
}

/**
 * Task ids to retire when a home profile item is removed: active, non-custom
 * tasks whose template applied before the change and no longer does.
 * Comparing before/after (rather than re-matching from scratch) means we
 * only ever touch what this removal is responsible for.
 */
export function tasksToRetire(
  before: HomeMatching,
  after: HomeMatching,
  healthFlags: HealthFlags,
  tasks: { id: string; name: string; isCustom: boolean | null; isActive: boolean | null }[]
): string[] {
  const stillApplies = new Set(getApplicableTemplates(after, healthFlags).map((t) => t.name));
  const dropped = new Set(
    getApplicableTemplates(before, healthFlags)
      .map((t) => t.name)
      .filter((name) => !stillApplies.has(name))
  );
  return tasks
    .filter((t) => t.isActive && !t.isCustom && dropped.has(t.name))
    .map((t) => t.id);
}

const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Due date for a task revived by re-adding its system/appliance. A date
 * still ahead is kept; a stale one (removed long ago) is rescheduled like a
 * newly added task, so re-adding never dumps a pile of overdue work.
 */
export function revivedDueDate(
  currentDue: string,
  template: Pick<TaskTemplate, "id" | "seasonalMonths">,
  frequencyValue: number,
  frequencyUnit: FrequencyUnit,
  now: Date = new Date()
): string {
  if (currentDue >= localIso(now)) return currentDue;
  return localIso(getInitialDueDate(template, frequencyValue, frequencyUnit, now));
}
