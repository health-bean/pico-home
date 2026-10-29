import { getNextDueDate } from "./next-due";
import type { FrequencyUnit } from "./templates";

/** Editing a task's dates by hand, and reverting its last Complete/Skip. */

interface Freq {
  frequencyValue: number;
  frequencyUnit: FrequencyUnit;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" → local-noon Date (noon keeps timezone shifts off the day). */
export function parseDay(day: string): Date | null {
  if (!DATE_RE.test(day)) return null;
  const d = new Date(day + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  // Reject rollovers like Feb 30 → Mar 2
  return formatDay(d) === day ? d : null;
}

export function formatDay(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * "Today" for a date check: the client's local day if it's within a day of
 * the server's UTC day (timezones), else the server's day.
 */
export function clientToday(claimed: string | undefined, now: Date = new Date()): string {
  const server = now.toISOString().slice(0, 10);
  if (!claimed || !parseDay(claimed)) return server;
  const diffDays = Math.abs(Date.parse(claimed) - Date.parse(server)) / 86_400_000;
  return diffDays <= 1 ? claimed : server;
}

/** Next due date implied by a last-done day. */
export function nextDueFrom(lastDone: string, freq: Freq): string {
  const base = parseDay(lastDone);
  if (!base) throw new Error(`Invalid date ${lastDone}`);
  return formatDay(getNextDueDate(freq.frequencyValue, freq.frequencyUnit, base));
}

export type DateEditResult =
  | { ok: true; updates: { nextDueDate?: string; lastCompletedDate?: string | null } }
  | { ok: false; error: string };

/**
 * Validate a manual date edit. Changing only "last done" reschedules next due
 * from it; an explicit next due always wins.
 */
export function resolveDateEdit(
  input: { nextDueDate?: string; lastCompletedDate?: string | null },
  freq: Freq,
  today: string
): DateEditResult {
  const updates: { nextDueDate?: string; lastCompletedDate?: string | null } = {};

  if (input.lastCompletedDate !== undefined) {
    if (input.lastCompletedDate !== null) {
      if (!parseDay(input.lastCompletedDate)) return { ok: false, error: "Invalid last-done date" };
      if (input.lastCompletedDate > today) {
        return { ok: false, error: "Last done can't be in the future" };
      }
    }
    updates.lastCompletedDate = input.lastCompletedDate;
  }

  if (input.nextDueDate !== undefined) {
    if (!parseDay(input.nextDueDate)) return { ok: false, error: "Invalid next-due date" };
    updates.nextDueDate = input.nextDueDate;
  } else if (input.lastCompletedDate) {
    updates.nextDueDate = nextDueFrom(input.lastCompletedDate, freq);
  }

  return { ok: true, updates };
}

export interface CompletionRow {
  id: string;
  completedAt: Date;
  createdAt: Date;
  skipped: boolean | null;
}

/**
 * Undo the most recently recorded Complete or Skip, whenever it happened.
 * The task falls back to its previous real completion (skips don't count);
 * with none left it's never-done and due today.
 */
export function planRevertLast(
  completions: CompletionRow[],
  freq: Freq,
  today: string
): { deleteId: string; lastCompletedDate: string | null; nextDueDate: string } | null {
  if (completions.length === 0) return null;

  const latest = completions.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
  const remaining = completions.filter((c) => c.id !== latest.id && !c.skipped);
  const prev = remaining.length
    ? remaining.reduce((a, b) => (b.completedAt > a.completedAt ? b : a))
    : null;

  const lastCompletedDate = prev ? formatDay(prev.completedAt) : null;
  return {
    deleteId: latest.id,
    lastCompletedDate,
    nextDueDate: lastCompletedDate ? nextDueFrom(lastCompletedDate, freq) : today,
  };
}
