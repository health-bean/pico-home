import type {
  TaskTemplate,
  FrequencyUnit,
  HomeType,
  SystemType,
  ApplianceCategory,
  HealthFlagKey,
} from "./templates";
import { TASK_TEMPLATES } from "./templates";

export type HealthFlags = Partial<Record<HealthFlagKey, boolean>>;

/**
 * Calculate the next due date based on frequency and last completion.
 * If no last completion, returns today's date (task is immediately due).
 */
export function getNextDueDate(
  frequencyValue: number,
  frequencyUnit: FrequencyUnit,
  lastCompleted?: Date
): Date {
  const base = lastCompleted ? new Date(lastCompleted) : new Date();

  switch (frequencyUnit) {
    case "days":
      base.setDate(base.getDate() + frequencyValue);
      break;
    case "weeks":
      base.setDate(base.getDate() + frequencyValue * 7);
      break;
    case "months":
      base.setMonth(base.getMonth() + frequencyValue);
      break;
    case "years":
      base.setFullYear(base.getFullYear() + frequencyValue);
      break;
    case "one_time":
      // One-time tasks don't recur; return far future if already completed
      if (lastCompleted) {
        base.setFullYear(base.getFullYear() + 100);
      }
      break;
  }

  return base;
}

/**
 * Adjust a task's frequency value based on active health flags.
 * Applies the lowest matching multiplier (more frequent = smaller value).
 * Always returns at least 1.
 */
export function adjustFrequencyForHealth(
  frequencyValue: number,
  multipliers: Partial<Record<HealthFlagKey, number>>,
  flags: HealthFlags
): number {
  let lowestMultiplier = 1;
  for (const [key, multiplier] of Object.entries(multipliers)) {
    if (flags[key as HealthFlagKey] && multiplier < lowestMultiplier) {
      lowestMultiplier = multiplier;
    }
  }
  return Math.max(1, Math.round(frequencyValue * lowestMultiplier));
}

/**
 * Check whether a template should be included based on health flags.
 * If no healthRequired keys, always include. Otherwise, at least one must match.
 */
export function shouldIncludeHealthTemplate(
  healthRequired: HealthFlagKey[],
  flags: HealthFlags
): boolean {
  if (healthRequired.length === 0) return true;
  return healthRequired.some((key) => flags[key] === true);
}

/**
 * Filter task templates to only those applicable to a specific home
 * based on home type, installed systems, registered appliances, and health flags.
 */
export function getApplicableTemplates(home: {
  type: HomeType;
  systems: SystemType[];
  appliances: ApplianceCategory[];
}, healthFlags?: HealthFlags): TaskTemplate[] {
  return TASK_TEMPLATES.filter((template) => {
    // Check home type applicability
    if (
      template.applicableHomeTypes.length > 0 &&
      !template.applicableHomeTypes.includes(home.type)
    ) {
      return false;
    }

    // If the template requires specific systems, check that at least one matches
    if (template.applicableSystems.length > 0) {
      const hasMatchingSystem = template.applicableSystems.some((s) =>
        home.systems.includes(s)
      );
      if (!hasMatchingSystem) return false;
    }

    // If the template is for specific appliances, check that at least one matches
    if (template.applicableApplianceCategories.length > 0) {
      const hasMatchingAppliance = template.applicableApplianceCategories.some(
        (a) => home.appliances.includes(a)
      );
      if (!hasMatchingAppliance) return false;
    }

    // Health-required filter
    if (template.healthRequired.length > 0) {
      if (!healthFlags || !shouldIncludeHealthTemplate(template.healthRequired, healthFlags)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter templates to those relevant for a given month.
 * Returns year-round tasks (empty seasonalMonths) plus seasonal matches.
 */
export function getSeasonalTasks(
  month: number,
  templates: TaskTemplate[]
): TaskTemplate[] {
  return templates.filter(
    (t) => t.seasonalMonths.length === 0 || t.seasonalMonths.includes(month)
  );
}

/**
 * Convert frequency value + unit to an approximate number of days.
 */
function frequencyToDays(value: number, unit: string): number {
  switch (unit) {
    case "days": return value;
    case "weeks": return value * 7;
    case "months": return value * 30;
    case "years": return value * 365;
    case "one_time": return 365; // treat as yearly for scoring purposes
    default: return 30;
  }
}

/**
 * Calculate a home maintenance score based on task completion status.
 * Returns scores 0-100 for overall and three sub-categories.
 *
 * Decay is scaled by task frequency — being 3 days late on a weekly task
 * (43% of a cycle) is much worse than 3 days late on a yearly task (0.8%).
 * A task scores 0 when it's one full cycle overdue.
 *
 * IMPORTANT: These scores reflect task completion compliance only —
 * NOT the actual condition or safety of the home. This distinction
 * matters for liability. Never present these as safety assessments.
 */
export function calculateHomeHealthScore(
  tasks: {
    nextDueDate: Date;
    priority: string;
    lastCompletedDate: Date | null;
    isActive: boolean;
    frequencyValue: number;
    frequencyUnit: string;
  }[]
): {
  overall: number;
  criticalTasks: number;
  preventiveCare: number;
  homeEfficiency: number;
} {
  const now = new Date();
  const activeTasks = tasks.filter((t) => t.isActive);

  if (activeTasks.length === 0) {
    return { overall: 100, criticalTasks: 100, preventiveCare: 100, homeEfficiency: 100 };
  }

  // Priority weights — critical tasks matter most
  const weights: Record<string, number> = {
    safety: 4,
    prevent_damage: 3,
    efficiency: 2,
    cosmetic: 1,
  };

  // Score each task: on-time = 100, overdue decays proportional to cycle length
  function scoreTask(task: (typeof activeTasks)[number]): number {
    const dueDate = new Date(task.nextDueDate);
    if (dueDate >= now) return 100; // Not yet due

    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Decay scaled by frequency: score hits 0 when one full cycle overdue
    const cycleDays = frequencyToDays(task.frequencyValue, task.frequencyUnit);
    const overdueFraction = daysOverdue / cycleDays;
    return Math.max(0, Math.round(100 * (1 - overdueFraction)));
  }

  // Calculate category scores
  function categoryScore(priority: string): number {
    const categoryTasks = activeTasks.filter((t) => t.priority === priority);
    if (categoryTasks.length === 0) return 100;
    const total = categoryTasks.reduce((sum, t) => sum + scoreTask(t), 0);
    return Math.round(total / categoryTasks.length);
  }

  const criticalTasks = categoryScore("safety");
  const preventiveCare = categoryScore("prevent_damage");
  const homeEfficiency = Math.round(
    (categoryScore("efficiency") + categoryScore("cosmetic")) / 2
  );

  // Weighted overall score
  let totalWeight = 0;
  let weightedSum = 0;

  for (const task of activeTasks) {
    const weight = weights[task.priority] || 1;
    totalWeight += weight;
    weightedSum += scoreTask(task) * weight;
  }

  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

  return { overall, criticalTasks, preventiveCare, homeEfficiency };
}
