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
 * New users get a quiet start: only starters are due in the first two weeks,
 * so day one isn't a wall of tasks (tester feedback: "overwhelmed").
 */
export const QUIET_START_DAYS = 14;

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * First due date for a newly created task with unknown history.
 *
 * - Nothing (except one_time) lands inside the quiet start window.
 * - Seasonal templates land on a deterministic day (1–28) of the nearest
 *   upcoming seasonal month — spread, not all stacked on the 15th. If that
 *   date falls inside the quiet window, it spills to days 14–27 instead of
 *   skipping a whole year.
 * - Everything else staggers deterministically (by template id) across one
 *   cycle after the quiet window, capped at a year, so frequency cohorts
 *   don't all land on day 30/90/180/365.
 * - one_time tasks are due today.
 *
 * Starters bypass this entirely (onboarding seeds them due today).
 * Recurrence after a completion is getNextDueDate's job, not this one's.
 */
export function getInitialDueDate(
  template: Pick<TaskTemplate, "id" | "seasonalMonths">,
  frequencyValue: number,
  frequencyUnit: FrequencyUnit,
  now: Date = new Date()
): Date {
  if (frequencyUnit === "one_time") return new Date(now);

  const hash = stableHash(template.id);
  const quietEnd = addDays(now, QUIET_START_DAYS);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (template.seasonalMonths.length > 0) {
    const day = 1 + (hash % 28);
    const candidates = template.seasonalMonths
      .flatMap((m) => [
        new Date(now.getFullYear(), m - 1, day),
        new Date(now.getFullYear() + 1, m - 1, day),
      ])
      .filter((d) => d.getTime() >= today.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    if (candidates.length > 0) {
      return candidates[0] < quietEnd
        ? addDays(quietEnd, hash % QUIET_START_DAYS)
        : candidates[0];
    }
  }

  const days = Math.min(cycleDays(frequencyValue, frequencyUnit), 365);
  const span = Math.max(days - QUIET_START_DAYS, Math.min(days, QUIET_START_DAYS), 1);
  return addDays(quietEnd, hash % span);
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
