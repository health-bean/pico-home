import { frequencyToDays } from "./scheduling";

/** How many tasks the dashboard shows before collapsing to "+N more". */
export const DASHBOARD_LIMIT = 5;

/**
 * Overdue tasks turn from "slipping" to "late" at half a cycle — the same
 * lateness ÷ cycle measure the score uses, so colour and score agree.
 */
const LATE_FRACTION = 0.5;

export type UrgencyLevel = "late" | "slipping" | "today" | "upcoming";

interface ListTask {
  nextDueDate: string;
  priority: string;
  frequencyValue: number;
  frequencyUnit: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysUntil(dateStr: string, todayStr: string): number {
  return Math.round(
    (Date.parse(dateStr + "T00:00:00Z") - Date.parse(todayStr + "T00:00:00Z")) / DAY_MS
  );
}

function lateFraction(task: ListTask, todayStr: string): number {
  const late = -daysUntil(task.nextDueDate, todayStr);
  return late / frequencyToDays(task.frequencyValue, task.frequencyUnit);
}

export function dashboardUrgency(
  task: ListTask,
  todayStr: string
): { level: UrgencyLevel; label: string } {
  const diff = daysUntil(task.nextDueDate, todayStr);
  if (diff < 0) {
    return {
      level: lateFraction(task, todayStr) >= LATE_FRACTION ? "late" : "slipping",
      label: "Overdue",
    };
  }
  if (diff === 0) return { level: "today", label: "Today" };
  if (diff === 1) return { level: "upcoming", label: "Tomorrow" };
  return { level: "upcoming", label: "Soon" };
}

/**
 * Pick the dashboard's short list: overdue before upcoming, safety first
 * within each; overdue ordered by lateness relative to cycle, upcoming by date.
 */
export function selectDashboardTasks<T extends ListTask>(
  tasks: T[],
  todayStr: string,
  limit = DASHBOARD_LIMIT
): { shown: T[]; moreCount: number } {
  const safetyRank = (t: T) => (t.priority === "safety" ? 0 : 1);
  const overdue = tasks
    .filter((t) => daysUntil(t.nextDueDate, todayStr) < 0)
    .sort(
      (a, b) =>
        safetyRank(a) - safetyRank(b) ||
        lateFraction(b, todayStr) - lateFraction(a, todayStr)
    );
  const upcoming = tasks
    .filter((t) => daysUntil(t.nextDueDate, todayStr) >= 0)
    .sort(
      (a, b) =>
        safetyRank(a) - safetyRank(b) || a.nextDueDate.localeCompare(b.nextDueDate)
    );
  const ordered = [...overdue, ...upcoming];
  return { shown: ordered.slice(0, limit), moreCount: Math.max(0, ordered.length - limit) };
}
