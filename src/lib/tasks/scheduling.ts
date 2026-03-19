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
 * Calculate a home upkeep score based on task completion status.
 * Returns scores 0-100 for overall and three sub-categories.
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

  // Score each task: on-time = 100, overdue decays based on how overdue
  function scoreTask(task: (typeof activeTasks)[number]): number {
    const dueDate = new Date(task.nextDueDate);
    if (dueDate >= now) return 100; // Not yet due

    const daysOverdue = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Decay: lose 2 points per day overdue, floor at 0
    return Math.max(0, 100 - daysOverdue * 2);
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
