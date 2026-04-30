"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, ChevronDown, Check, SkipForward, Clock, Home,
  Shield, Thermometer, Droplet, Zap, Trees, Refrigerator, Wind, Fence,
} from "lucide-react";
import {
  Button,
  Badge,
  Input,
  Select,
  Dialog,
  EmptyState,
  SkeletonCard,
  useToast,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
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
  createdAt: string;
  updatedAt: string;
}

type FilterKey = "all" | "overdue" | "due_soon" | "completed";
type StatusGroup = "overdue" | "due_soon" | "upcoming";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(dateStr: string, today: Date): number {
  const d = new Date(dateStr + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusGroup(task: Task, today: Date): StatusGroup {
  const diff = daysBetween(task.nextDueDate, today);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "due_soon";
  return "upcoming";
}

function relativeDueLabel(dateStr: string, today: Date): { text: string; color: string } {
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

// ---------------------------------------------------------------------------
// Category & Priority mappings
// ---------------------------------------------------------------------------

const CATEGORY_CONFIG: Record<string, { label: string }> = {
  safety: { label: "Safety & Security" },
  air_quality: { label: "Air Quality & Health" },
  heating_cooling: { label: "Heating & Cooling" },
  plumbing: { label: "Plumbing & Water" },
  power: { label: "Power" },
  exterior_structure: { label: "Exterior & Structure" },
  outdoors_stuff: { label: "Outdoors Stuff" },
  appliances: { label: "Appliances" },
};

function getCategoryLabel(category: string): string {
  return CATEGORY_CONFIG[category]?.label || category;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  safety: Shield,
  air_quality: Wind,
  heating_cooling: Thermometer,
  plumbing: Droplet,
  power: Zap,
  exterior_structure: Home,
  outdoors_stuff: Fence,
  appliances: Refrigerator,
};

const categoryBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  safety: "danger",
  air_quality: "warning",
  heating_cooling: "info",
  plumbing: "info",
  power: "warning",
  exterior_structure: "success",
  outdoors_stuff: "success",
  appliances: "default",
};

const SUBGROUP_LABELS: Record<string, string> = {
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
const FLAT_CATEGORIES = new Set(["appliances", "air_quality"]);

const priorityLabels: Record<string, string> = {
  safety: "Critical",
  prevent_damage: "Preventive",
  efficiency: "Efficiency",
  cosmetic: "Cosmetic",
};

const filterOptions: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due Soon" },
  { key: "completed", label: "Completed" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [completionDate, setCompletionDate] = useState<string>("");
  const [completionCost, setCompletionCost] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFreqValue, setEditFreqValue] = useState(1);
  const [editFreqUnit, setEditFreqUnit] = useState("months");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  // Add-task form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("heating_cooling");
  const [newPriority, setNewPriority] = useState("prevent_damage");
  const [newFreqValue, setNewFreqValue] = useState<number>(1);
  const [newFreqUnit, setNewFreqUnit] = useState("months");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset completion date and cost when selecting a new task
  useEffect(() => {
    setCompletionDate("");
    setCompletionCost("");
  }, [selectedTask?.id]);

  // Populate edit fields when a task is selected
  useEffect(() => {
    if (selectedTask) {
      setEditName(selectedTask.name);
      setEditFreqValue(selectedTask.frequencyValue);
      setEditFreqUnit(selectedTask.frequencyUnit);
      setEditNotes(selectedTask.notes || "");
      setEditing(false);
    }
  }, [selectedTask]);

  const today = getToday();

  // -------------------------------------------------------------------------
  // Fetch tasks
  // -------------------------------------------------------------------------

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data.tasks);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const saveTaskEdit = useCallback(async () => {
    if (!selectedTask) return;
    setEditSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          frequencyValue: editFreqValue,
          frequencyUnit: editFreqUnit,
          notes: editNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditing(false);
      setSelectedTask(null);
      await fetchTasks();
      toast("Task updated", "success");
    } catch {
      toast("Failed to update task", "error");
    } finally {
      setEditSaving(false);
    }
  }, [selectedTask, editName, editFreqValue, editFreqUnit, editNotes, fetchTasks, toast]);

  const completeTask = useCallback(
    async (id: string, completedDate?: string, costCents?: number) => {
      setActionLoading(id);
      try {
        const body: Record<string, unknown> = {};
        if (completedDate) body.completedDate = completedDate;
        if (costCents !== undefined) body.costCents = costCents;
        const res = await fetch(`/api/tasks/${id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Failed to complete task");
        toast("Task completed!", "success");
        await fetchTasks();
      } catch {
        toast("Failed to complete task", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks, toast]
  );

  const skipTask = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/tasks/${id}/skip`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error("Failed to skip task");
        await fetchTasks();
        toast("Task skipped", "info");
      } catch {
        toast("Failed to skip task", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks, toast]
  );

  const snoozeTask = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/tasks/${id}/snooze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ days: 7 }),
        });
        if (!res.ok) throw new Error("Failed to snooze task");
        await fetchTasks();
        toast("Task snoozed for 7 days", "info");
      } catch {
        toast("Failed to snooze task", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks, toast]
  );

  const handleAddTask = useCallback(async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: "",
          category: newCategory,
          priority: newPriority,
          frequencyValue: newFreqValue,
          frequencyUnit: newFreqUnit,
          notes: newNotes.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      setAddOpen(false);
      setNewName("");
      setNewCategory("heating_cooling");
      setNewPriority("prevent_damage");
      setNewFreqValue(1);
      setNewFreqUnit("months");
      setNewNotes("");
      await fetchTasks();
      toast("Task added!", "success");
    } catch {
      toast("Failed to add task", "error");
    } finally {
      setSaving(false);
    }
  }, [newName, newCategory, newPriority, newFreqValue, newFreqUnit, newNotes, fetchTasks, toast]);

  // -------------------------------------------------------------------------
  // Filtering & grouping
  // -------------------------------------------------------------------------

  const activeTasks = tasks.filter((t) => t.isActive);
  const completedTasks = tasks.filter((t) => !t.isActive);

  const byDate = (a: Task, b: Task) =>
    new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();

  const tasksByCategory = activeTasks.reduce<Record<string, Task[]>>((acc, task) => {
    const cat = task.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(task);
    return acc;
  }, {});

  for (const cat of Object.keys(tasksByCategory)) {
    tasksByCategory[cat].sort(byDate);
  }

  const sortedCategories = Object.keys(tasksByCategory).sort((a, b) => {
    const aHasOverdue = tasksByCategory[a].some((t) => daysBetween(t.nextDueDate, today) < 0);
    const bHasOverdue = tasksByCategory[b].some((t) => daysBetween(t.nextDueDate, today) < 0);
    if (aHasOverdue && !bHasOverdue) return -1;
    if (!aHasOverdue && bHasOverdue) return 1;
    return getCategoryLabel(a).localeCompare(getCategoryLabel(b));
  });

  const overdueCount = activeTasks.filter((t) => daysBetween(t.nextDueDate, today) < 0).length;
  const dueSoonCount = activeTasks.filter((t) => {
    const diff = daysBetween(t.nextDueDate, today);
    return diff >= 0 && diff <= 7;
  }).length;

  const counts: Record<FilterKey, number> = {
    all: activeTasks.length,
    overdue: overdueCount,
    due_soon: dueSoonCount,
    completed: completedTasks.length,
  };

  completedTasks.sort(byDate);

  // Auto-expand urgent categories on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (activeTasks.length === 0) return;
    const urgent = new Set<string>();
    for (const task of activeTasks) {
      const diff = daysBetween(task.nextDueDate, today);
      if (diff <= 7) urgent.add(task.category);
    }
    setExpandedCategories(urgent);
  }, [tasks.length > 0]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  function renderTaskRow(task: Task, group: StatusGroup | "completed") {
    const due = relativeDueLabel(task.nextDueDate, today);
    const priLabel = priorityLabels[task.priority] || task.priority;
    const stripColor =
      group === "overdue"
        ? "bg-[#ef4444]"
        : group === "due_soon"
          ? "bg-[#f59e0b]"
          : "bg-[#e7e5e4]";
    const isActioning = actionLoading === task.id;
    const isUpcoming = group === "upcoming";

    return (
      <button
        key={task.id}
        onClick={() => setSelectedTask(task)}
        className={`w-full bg-white rounded-2xl border border-[var(--color-neutral-200)] p-3.5 flex items-center gap-3 text-left transition-all duration-300 ${
          isActioning ? "opacity-30 scale-95" : ""
        } ${isUpcoming ? "opacity-60" : ""} ${!task.isActive ? "opacity-60" : ""}`}
      >
        {/* Priority strip */}
        <div className={`w-1 h-8 rounded-full shrink-0 ${stripColor}`} />

        {/* Checkbox circle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (task.isActive) completeTask(task.id);
          }}
          disabled={isActioning || !task.isActive}
          className="w-[22px] h-[22px] rounded-full border-2 border-[var(--color-neutral-300)] shrink-0 flex items-center justify-center hover:border-neutral-400 transition-colors disabled:opacity-50"
          title="Complete task"
        >
          {!task.isActive && <Check className="w-3 h-3 text-neutral-400" />}
        </button>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">
            {task.name}
          </p>
          <p className="text-xs text-[var(--color-neutral-400)] mt-0.5 truncate">
            {getCategoryLabel(task.category)} &middot; {priLabel} &middot;{" "}
            <span className={due.color}>{due.text}</span>
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-[var(--color-neutral-300)] shrink-0" />
      </button>
    );
  }

  function renderCategorySection(category: string, categoryTasks: Task[]) {
    const label = getCategoryLabel(category);
    const IconComponent = CATEGORY_ICONS[category] || Home;
    const isExpanded = expandedCategories.has(category);
    const overdueInCat = categoryTasks.filter((t) => daysBetween(t.nextDueDate, today) < 0).length;
    const dueSoonInCat = categoryTasks.filter((t) => {
      const diff = daysBetween(t.nextDueDate, today);
      return diff >= 0 && diff <= 7;
    }).length;

    let visibleTasks = categoryTasks;
    if (filter === "overdue") visibleTasks = categoryTasks.filter((t) => daysBetween(t.nextDueDate, today) < 0);
    else if (filter === "due_soon") visibleTasks = categoryTasks.filter((t) => { const d = daysBetween(t.nextDueDate, today); return d >= 0 && d <= 7; });

    if (visibleTasks.length === 0) return null;

    // Group tasks by subgroup for non-flat categories
    const isFlat = FLAT_CATEGORIES.has(category);
    const subgroupMap: Record<string, Task[]> = {};
    if (!isFlat) {
      for (const task of visibleTasks) {
        const sg = task.subgroup || "other";
        if (!subgroupMap[sg]) subgroupMap[sg] = [];
        subgroupMap[sg].push(task);
      }
    }

    // Sort sub-groups: those with overdue tasks first, then alphabetical
    const sortedSubgroups = Object.keys(subgroupMap).sort((a, b) => {
      const aOverdue = subgroupMap[a].some((t) => daysBetween(t.nextDueDate, today) < 0);
      const bOverdue = subgroupMap[b].some((t) => daysBetween(t.nextDueDate, today) < 0);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      return (SUBGROUP_LABELS[a] || a).localeCompare(SUBGROUP_LABELS[b] || b);
    });

    return (
      <section key={category} className="mb-4">
        <button onClick={() => toggleCategory(category)} className="w-full flex items-center gap-2.5 px-1 py-2">
          <IconComponent className="w-4 h-4 text-[var(--color-neutral-400)] shrink-0" />
          <span className="text-[13px] font-bold text-stone-900 flex-1 text-left">{label}</span>
          {overdueInCat > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
              {overdueInCat} overdue
            </span>
          )}
          {overdueInCat === 0 && dueSoonInCat > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
              {dueSoonInCat} due soon
            </span>
          )}
          <span className="text-[11px] text-[var(--color-neutral-400)]">{visibleTasks.length}</span>
          {isExpanded ? <ChevronDown className="w-4 h-4 text-[var(--color-neutral-300)]" /> : <ChevronRight className="w-4 h-4 text-[var(--color-neutral-300)]" />}
        </button>
        {isExpanded && (
          <div className="flex flex-col gap-2 mt-1">
            {isFlat ? (
              visibleTasks.map((task) => renderTaskRow(task, getStatusGroup(task, today)))
            ) : (
              sortedSubgroups.map((sg) => {
                const sgTasks = subgroupMap[sg];
                const sgOverdue = sgTasks.filter((t) => daysBetween(t.nextDueDate, today) < 0).length;
                return (
                  <div key={sg}>
                    <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                      <span className="text-[12px] font-bold text-stone-700">
                        {SUBGROUP_LABELS[sg] || sg}
                      </span>
                      {sgOverdue > 0 && (
                        <span className="inline-flex items-center justify-center rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                          {sgOverdue} overdue
                        </span>
                      )}
                    </div>
                    {sgTasks.map((task) => renderTaskRow(task, getStatusGroup(task, today)))}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>
    );
  }

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-20 animate-pulse rounded bg-neutral-200" />
          <div className="h-9 w-9 animate-pulse rounded-xl bg-neutral-200" />
        </div>
        {/* Filter pills skeleton */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-neutral-200" />
          ))}
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <EmptyState
          title="Failed to load tasks"
          description={error}
          action={{ label: "Retry", onClick: () => { setLoading(true); fetchTasks(); } }}
        />
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------

  if (tasks.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--color-neutral-900)]">
            Tasks
          </h1>
          <button
            onClick={() => setAddOpen(true)}
            className="h-9 w-9 flex items-center justify-center bg-[#1c1917] rounded-xl transition-colors"
          >
            <Plus className="w-[18px] h-[18px] text-white" />
          </button>
        </div>
        <EmptyState
          icon={<Home className="h-10 w-10" />}
          title="No tasks yet"
          description="Complete onboarding to get personalized maintenance tasks for your home."
          action={{
            label: "Start Onboarding",
            onClick: () => router.push("/onboarding"),
            variant: "primary",
          }}
        />

        {/* Add Task Dialog — keep available even in empty state */}
        <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Task" size="md">
          {renderAddTaskForm()}
        </Dialog>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Add Task form (shared)
  // -------------------------------------------------------------------------

  function renderAddTaskForm() {
    return (
      <div className="space-y-4 mt-2">
        <Input
          label="Task Name"
          placeholder="e.g. Clean dryer vent"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />

        <Select
          label="Category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          options={Object.entries(CATEGORY_CONFIG).map(([value, { label }]) => ({
            value,
            label,
          }))}
        />

        <Select
          label="Priority"
          value={newPriority}
          onChange={(e) => setNewPriority(e.target.value)}
          options={[
            { value: "safety", label: "Critical" },
            { value: "prevent_damage", label: "Preventive" },
            { value: "efficiency", label: "Efficiency" },
            { value: "cosmetic", label: "Cosmetic" },
          ]}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Frequency"
            type="number"
            min={1}
            placeholder="1"
            value={String(newFreqValue)}
            onChange={(e) => setNewFreqValue(Math.max(1, parseInt(e.target.value) || 1))}
          />
          <Select
            label="Unit"
            value={newFreqUnit}
            onChange={(e) => setNewFreqUnit(e.target.value)}
            options={[
              { value: "days", label: "Days" },
              { value: "weeks", label: "Weeks" },
              { value: "months", label: "Months" },
              { value: "years", label: "Years" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Any additional notes..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleAddTask}
            disabled={!newName.trim() || saving}
          >
            {saving ? "Saving..." : "Save Task"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-extrabold tracking-tight text-[var(--color-neutral-900)]">
          Tasks
        </h1>
        <button
          onClick={() => setAddOpen(true)}
          className="h-9 w-9 flex items-center justify-center bg-[#1c1917] rounded-xl transition-colors"
        >
          <Plus className="w-[18px] h-[18px] text-white" />
        </button>
      </div>

      {/* Filter pills */}
      <div className="mb-6 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {filterOptions.map((opt) => {
            const isActive = filter === opt.key;
            const count = counts[opt.key];
            return (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                  isActive
                    ? "bg-[#1c1917] text-white font-semibold"
                    : "bg-[var(--color-neutral-100)] text-[var(--color-neutral-500)] font-medium"
                }`}
              >
                {opt.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full px-1 text-[11px] font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-[var(--color-neutral-200)] text-[var(--color-neutral-500)]"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task groups */}
      <div>
        {filter !== "completed" && sortedCategories.map((cat) => renderCategorySection(cat, tasksByCategory[cat]))}
        {filter === "completed" && completedTasks.length > 0 && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-2.5 text-green-600">
              Completed <span className="ml-1.5 text-[11px] font-normal opacity-60">({completedTasks.length})</span>
            </h2>
            <div className="flex flex-col gap-2">
              {completedTasks.sort(byDate).map((task) => renderTaskRow(task, "completed"))}
            </div>
          </section>
        )}
        {filter === "overdue" && overdueCount === 0 && <EmptyState icon={<Check className="h-8 w-8" />} title="No overdue tasks" description="You're all caught up!" />}
        {filter === "due_soon" && dueSoonCount === 0 && <EmptyState icon={<Check className="h-8 w-8" />} title="Nothing due soon" description="No tasks due in the next 7 days." />}
        {filter === "completed" && completedTasks.length === 0 && <EmptyState icon={<Check className="h-8 w-8" />} title="No completed tasks" description="You haven't completed any tasks yet." />}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Task Detail Dialog                                                   */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={!!selectedTask}
        onClose={() => { setSelectedTask(null); setEditing(false); }}
        title={editing ? "Edit Task" : selectedTask?.name}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-5 mt-2">
            {editing ? (
              <div className="space-y-4">
                <Input
                  label="Task Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Frequency"
                    type="number"
                    min={1}
                    value={String(editFreqValue)}
                    onChange={(e) => setEditFreqValue(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  <Select
                    label="Unit"
                    value={editFreqUnit}
                    onChange={(e) => setEditFreqUnit(e.target.value)}
                    options={[
                      { value: "days", label: "Days" },
                      { value: "weeks", label: "Weeks" },
                      { value: "months", label: "Months" },
                      { value: "years", label: "Years" },
                    ]}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-foreground">Notes</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Any notes..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="primary" className="flex-1" onClick={saveTaskEdit} disabled={!editName.trim() || editSaving}>
                    {editSaving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                    Edit
                  </Button>
                </div>

                {selectedTask.description && (
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={categoryBadgeVariant[selectedTask.category] || "default"}
                    size="md"
                  >
                    {getCategoryLabel(selectedTask.category)}
                  </Badge>
                  <Badge
                    variant={
                      selectedTask.priority === "safety"
                        ? "danger"
                        : selectedTask.priority === "prevent_damage"
                          ? "warning"
                          : selectedTask.priority === "efficiency"
                            ? "info"
                            : "success"
                    }
                    size="md"
                  >
                    {priorityLabels[selectedTask.priority] || selectedTask.priority} Priority
                  </Badge>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Frequency</p>
                    <p className="text-sm font-medium text-foreground">
                      Every {selectedTask.frequencyValue} {selectedTask.frequencyUnit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Next Due</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(selectedTask.nextDueDate + "T00:00:00").toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="text-sm font-medium text-foreground">
                      {getCategoryLabel(selectedTask.category)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Completed</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedTask.lastCompletedDate
                        ? new Date(selectedTask.lastCompletedDate + "T00:00:00").toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Never"}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {selectedTask.notes && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1">Notes</h4>
                    <p className="text-sm text-muted-foreground">{selectedTask.notes}</p>
                  </div>
                )}

                {/* Backdate option */}
                {selectedTask.isActive && (
                  <div>
                    <label className="text-xs text-muted-foreground">When did you last do this? (optional)</label>
                    <input
                      type="date"
                      value={completionDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}

                {/* Cost option */}
                {selectedTask.isActive && (
                  <div>
                    <label className="text-xs text-muted-foreground">Cost (optional)</label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={completionCost}
                        onChange={(e) => setCompletionCost(e.target.value)}
                        className="w-full rounded-lg border border-border bg-white pl-7 pr-3 py-2 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedTask.isActive && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => {
                        completeTask(selectedTask.id, completionDate || undefined, completionCost ? Math.round(parseFloat(completionCost) * 100) : undefined);
                        setSelectedTask(null);
                      }}
                    >
                      <Check className="h-4 w-4" />
                      Complete
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        skipTask(selectedTask.id);
                        setSelectedTask(null);
                      }}
                    >
                      <SkipForward className="h-4 w-4" />
                      Skip
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={() => {
                        snoozeTask(selectedTask.id);
                        setSelectedTask(null);
                      }}
                    >
                      <Clock className="h-4 w-4" />
                      Snooze
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Dialog>

      {/* ------------------------------------------------------------------- */}
      {/* Add Task Dialog                                                      */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Task" size="md">
        {renderAddTaskForm()}
      </Dialog>
    </div>
  );
}
