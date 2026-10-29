import type { FrequencyUnit } from "./templates";

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
