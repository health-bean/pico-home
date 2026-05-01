// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Task {
  id: string;
  homeId: string;
  name: string;
  description: string;
  category: string;
  subgroup: string | null;
  priority: string;
  frequencyUnit: string;
  frequencyValue: number;
  nextDueDate: string; // "YYYY-MM-DD"
  lastCompletedDate: string | null;
  isActive: boolean;
  isCustom: boolean;
  notificationDaysBefore: number;
  notes: string;
  tips: string | null;
  whyItMatters: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FilterKey = "all" | "overdue" | "due_soon" | "completed" | "dismissed";
export type StatusGroup = "overdue" | "due_soon" | "upcoming";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysBetween(dateStr: string, today: Date): number {
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStatusGroup(task: Task, today: Date): StatusGroup {
  const diff = daysBetween(task.nextDueDate, today);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "due_soon";
  return "upcoming";
}

export function relativeDueLabel(
  dateStr: string,
  today: Date
): { text: string; color: string } {
  const diff = daysBetween(dateStr, today);
  if (diff < -1) {
    return {
      text: `${Math.abs(diff)} days overdue`,
      color: "text-red-600",
    };
  }
  if (diff === -1) {
    return {
      text: "1 day overdue",
      color: "text-red-600",
    };
  }
  if (diff === 0) {
    return { text: "Due today", color: "text-amber-600" };
  }
  if (diff === 1) {
    return { text: "Due tomorrow", color: "text-amber-600" };
  }
  if (diff <= 7) {
    return {
      text: `Due in ${diff} days`,
      color: "text-amber-600",
    };
  }
  if (diff <= 14) {
    const weeks = Math.round(diff / 7);
    return {
      text: `Due in ${weeks} week${weeks > 1 ? "s" : ""}`,
      color: "text-[var(--color-neutral-400)]",
    };
  }
  return {
    text: `Due in ${diff} days`,
    color: "text-[var(--color-neutral-400)]",
  };
}

export function getCategoryLabel(category: string): string {
  return CATEGORY_CONFIG[category]?.label || category;
}

// ---------------------------------------------------------------------------
// Category & Priority mappings
// ---------------------------------------------------------------------------

export const CATEGORY_CONFIG: Record<string, { label: string }> = {
  safety: { label: "Safety & Security" },
  air_quality: { label: "Air Quality & Health" },
  heating_cooling: { label: "Heating & Cooling" },
  plumbing: { label: "Plumbing & Water" },
  power: { label: "Power" },
  exterior_structure: { label: "Exterior & Structure" },
  outdoors_stuff: { label: "Outdoors Stuff" },
  appliances: { label: "Appliances" },
};

// CATEGORY_ICONS lives in page.tsx because it references React/Lucide components.

export const categoryBadgeVariant: Record<
  string,
  "default" | "success" | "warning" | "danger" | "info"
> = {
  safety: "danger",
  air_quality: "warning",
  heating_cooling: "info",
  plumbing: "info",
  power: "warning",
  exterior_structure: "success",
  outdoors_stuff: "success",
  appliances: "default",
};

export const SUBGROUP_LABELS: Record<string, string> = {
  fire_safety: "Fire Safety",
  child_safety: "Child Safety",
  accessibility: "Accessibility",
  air_filters_ducts: "Air Filters & Ducts",
  heating_system: "Heating System",
  cooling_system: "Cooling System",
  heat_pump: "Heat Pump",
  fireplace: "Fireplace",
  mini_split: "Mini-Split",
  water_heater: "Water Heater",
  pipes_drains: "Pipes & Drains",
  water_treatment: "Water Treatment",
  well_septic: "Well & Septic",
  electrical: "Electrical",
  generator: "Generator",
  solar: "Solar",
  roof_gutters: "Roof & Gutters",
  walls_windows_foundation: "Walls, Windows & Foundation",
  garage: "Garage",
  pest_control: "Pest Control",
  yard_structures: "Yard & Structures",
  irrigation: "Irrigation",
  pool_hot_tub: "Pool & Hot Tub",
};

// Categories that show tasks in flat list (no sub-group headers)
export const FLAT_CATEGORIES = new Set(["appliances", "air_quality"]);

export const priorityLabels: Record<string, string> = {
  safety: "Critical",
  prevent_damage: "Preventive",
  efficiency: "Efficiency",
  cosmetic: "Cosmetic",
};

export const filterOptions: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due Soon" },
  { key: "completed", label: "Completed" },
  { key: "dismissed", label: "Dismissed" },
];
