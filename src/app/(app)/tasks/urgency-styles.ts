import type { UrgencyLevel } from "@/lib/tasks/dashboard-list";

/**
 * One colour scale for how urgent a task is, shared by the dashboard and
 * Tasks so the same task never reads orange in one and red in the other.
 * "soon" = due in the next 7 days; "later" = further out.
 */
export type UrgencyTone = Exclude<UrgencyLevel, "upcoming"> | "soon" | "later";

export const URGENCY_STYLES: Record<UrgencyTone, { strip: string; badge: string; checkbox: string }> = {
  late: {
    strip: "bg-[var(--color-danger-500)]",
    badge: "bg-[var(--color-danger-50)] text-[var(--color-danger-700)]",
    checkbox: "border-[var(--color-danger-500)] hover:bg-[var(--color-danger-50)]",
  },
  slipping: {
    strip: "bg-[var(--color-warning-500)]",
    badge: "bg-[var(--color-warning-50)] text-[var(--color-warning-700)]",
    checkbox: "border-[var(--color-warning-500)] hover:bg-[var(--color-warning-50)]",
  },
  today: {
    strip: "bg-[var(--color-primary-400)]",
    badge: "bg-[var(--color-primary-50)] text-[var(--color-primary-700)]",
    checkbox: "border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)]",
  },
  soon: {
    strip: "bg-[var(--color-primary-200)]",
    badge: "bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]",
    checkbox: "border-[var(--color-neutral-300)] hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)]",
  },
  later: {
    strip: "bg-[var(--color-neutral-200)]",
    badge: "bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)]",
    checkbox: "border-[var(--color-neutral-300)] hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)]",
  },
};

/** Tone for a task: the dashboard's lateness rule, then soon vs later. */
export function urgencyTone(level: UrgencyLevel, daysUntilDue: number): UrgencyTone {
  if (level !== "upcoming") return level;
  return daysUntilDue <= 7 ? "soon" : "later";
}
