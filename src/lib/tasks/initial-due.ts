import type { TaskTemplate, FrequencyUnit } from "./templates";

/** djb2 — deterministic, non-negative, stable across runs. */
export function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function cycleDays(value: number, unit: FrequencyUnit): number {
  switch (unit) {
    case "days":
      return value;
    case "weeks":
      return value * 7;
    case "months":
      return value * 30;
    case "years":
      return value * 365;
    case "one_time":
      return 0;
  }
}

/**
 * First due date for a newly created task with unknown history.
 *
 * - Seasonal templates anchor to the 15th of the nearest upcoming seasonal
 *   month (this year if still ahead, else next year) — "Winterize Irrigation"
 *   lands in fall, not on the signup anniversary.
 * - Everything else staggers deterministically (by template id) across one
 *   cycle window, capped at a year, so frequency cohorts don't all land on
 *   day 30/90/180/365.
 * - one_time tasks are due today.
 *
 * Recurrence after a completion is getNextDueDate's job, not this one's.
 */
export function getInitialDueDate(
  template: Pick<TaskTemplate, "id" | "seasonalMonths">,
  frequencyValue: number,
  frequencyUnit: FrequencyUnit,
  now: Date = new Date()
): Date {
  if (frequencyUnit === "one_time") return new Date(now);

  if (template.seasonalMonths.length > 0) {
    const candidates = template.seasonalMonths
      .flatMap((m) => [
        new Date(now.getFullYear(), m - 1, 15),
        new Date(now.getFullYear() + 1, m - 1, 15),
      ])
      .filter((d) => d.getTime() >= now.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    if (candidates.length > 0) return candidates[0];
  }

  const days = Math.min(cycleDays(frequencyValue, frequencyUnit), 365);
  const minOffset = days <= 7 ? 0 : 3;
  const span = Math.max(days - minOffset, 1);
  const offset = minOffset + (stableHash(template.id) % span);
  const due = new Date(now);
  due.setDate(due.getDate() + offset);
  return due;
}

/** High-value, low-effort tasks that make day one real. Order = priority. */
export const STARTER_TEMPLATE_IDS: string[] = [
  "safety-test-smoke-detectors",
  "safety-test-co-detectors",
  "hvac-replace-filter",
  "safety-clean-dryer-vent",
  "electrical-test-gfci",
  "health-verify-water-heater-temp",
  "plumbing-check-toilets",
  "garage-test-auto-reverse",
];

/**
 * Pick the starter set for a home: the first `max` starter templates that are
 * actually applicable. These are seeded due today at onboarding (unless the
 * user marks them recently done in the Quick check step).
 */
export function selectStarterTemplates(
  applicable: TaskTemplate[],
  max = 6
): TaskTemplate[] {
  const byId = new Map(applicable.map((t) => [t.id, t]));
  const picked: TaskTemplate[] = [];
  for (const id of STARTER_TEMPLATE_IDS) {
    const t = byId.get(id);
    if (t) picked.push(t);
    if (picked.length >= max) break;
  }
  return picked;
}
