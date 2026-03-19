"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronRight, Check, SkipForward, Clock, Home } from "lucide-react";
import {
  Button,
  Badge,
  Input,
  Select,
  Dialog,
  EmptyState,
  SkeletonCard,
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

type FilterKey = "all" | "overdue" | "due_soon" | "upcoming" | "completed";
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

const categoryLabels: Record<string, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  exterior: "Exterior",
  appliance: "Appliance",
  safety: "Safety",
  lawn: "Lawn & Garden",
  cleaning: "Cleaning",
  roofing: "Roofing",
  pest_control: "Pest Control",
  interior: "Interior",
  general: "General",
};

const categoryBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  hvac: "info",
  plumbing: "info",
  electrical: "warning",
  exterior: "success",
  appliance: "default",
  safety: "danger",
  lawn: "success",
  cleaning: "default",
  roofing: "warning",
  pest_control: "danger",
  interior: "default",
  general: "default",
};

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
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Add-task form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("hvac");
  const [newPriority, setNewPriority] = useState("prevent_damage");
  const [newFreqValue, setNewFreqValue] = useState<number>(1);
  const [newFreqUnit, setNewFreqUnit] = useState("months");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

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

  const completeTask = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/tasks/${id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error("Failed to complete task");
        await fetchTasks();
      } catch {
        // silently fail — task list will stay as-is
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks]
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
      } catch {
        // silently fail
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks]
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
      } catch {
        // silently fail
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks]
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
      setNewCategory("hvac");
      setNewPriority("prevent_damage");
      setNewFreqValue(1);
      setNewFreqUnit("months");
      setNewNotes("");
      await fetchTasks();
    } catch {
      // stay on dialog so user can retry
    } finally {
      setSaving(false);
    }
  }, [newName, newCategory, newPriority, newFreqValue, newFreqUnit, newNotes, fetchTasks]);

  // -------------------------------------------------------------------------
  // Filtering & grouping
  // -------------------------------------------------------------------------

  const activeTasks = tasks.filter((t) => t.isActive);

  const grouped = activeTasks.reduce(
    (acc, task) => {
      const group = getStatusGroup(task, today);
      acc[group].push(task);
      return acc;
    },
    { overdue: [] as Task[], due_soon: [] as Task[], upcoming: [] as Task[] }
  );

  const completedTasks = tasks.filter((t) => !t.isActive);

  const counts: Record<FilterKey, number> = {
    all: activeTasks.length,
    overdue: grouped.overdue.length,
    due_soon: grouped.due_soon.length,
    upcoming: grouped.upcoming.length,
    completed: completedTasks.length,
  };

  const byDate = (a: Task, b: Task) =>
    new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime();

  grouped.overdue.sort(byDate);
  grouped.due_soon.sort(byDate);
  grouped.upcoming.sort(byDate);
  completedTasks.sort(byDate);

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
            {categoryLabels[task.category] || task.category} &middot; {priLabel} &middot;{" "}
            <span className={due.color}>{due.text}</span>
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-4 h-4 text-[var(--color-neutral-300)] shrink-0" />
      </button>
    );
  }

  function renderGroup(
    title: string,
    items: Task[],
    group: StatusGroup | "completed",
    titleColor: string
  ) {
    if (items.length === 0) return null;
    return (
      <section className="mb-5">
        <h2 className={`text-xs font-bold uppercase tracking-widest mb-2.5 ${titleColor}`}>
          {title}
          <span className="ml-1.5 text-[11px] font-normal opacity-60">({items.length})</span>
        </h2>
        <div className="flex flex-col gap-2">
          {items.map((task) => renderTaskRow(task, group))}
        </div>
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
          {[1, 2, 3, 4, 5].map((i) => (
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
          options={Object.entries(categoryLabels).map(([value, label]) => ({
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
        {(filter === "all" || filter === "overdue") &&
          renderGroup("Overdue", grouped.overdue, "overdue", "text-red-600")}

        {(filter === "all" || filter === "due_soon") &&
          renderGroup("Due this week", grouped.due_soon, "due_soon", "text-amber-500")}

        {(filter === "all" || filter === "upcoming") &&
          renderGroup("Upcoming", grouped.upcoming, "upcoming", "text-[var(--color-neutral-400)]")}

        {(filter === "all" || filter === "completed") &&
          completedTasks.length > 0 &&
          renderGroup("Completed", completedTasks, "completed", "text-green-600")}

        {/* Empty states for filtered views */}
        {filter === "overdue" && grouped.overdue.length === 0 && (
          <EmptyState
            icon={<Check className="h-8 w-8" />}
            title="No overdue tasks"
            description="You're all caught up! No tasks are past due."
          />
        )}
        {filter === "due_soon" && grouped.due_soon.length === 0 && (
          <EmptyState
            icon={<Check className="h-8 w-8" />}
            title="Nothing due soon"
            description="No tasks are due in the next 7 days."
          />
        )}
        {filter === "upcoming" && grouped.upcoming.length === 0 && (
          <EmptyState
            icon={<Check className="h-8 w-8" />}
            title="No upcoming tasks"
            description="No tasks scheduled beyond this week."
          />
        )}
        {filter === "completed" && completedTasks.length === 0 && (
          <EmptyState
            icon={<Check className="h-8 w-8" />}
            title="No completed tasks"
            description="You haven't completed any tasks yet. Get started!"
          />
        )}
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* Task Detail Dialog                                                   */}
      {/* ------------------------------------------------------------------- */}
      <Dialog
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.name}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-5 mt-2">
            {selectedTask.description && (
              <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <Badge
                variant={categoryBadgeVariant[selectedTask.category] || "default"}
                size="md"
              >
                {categoryLabels[selectedTask.category] || selectedTask.category}
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
                  {categoryLabels[selectedTask.category] || selectedTask.category}
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

            {/* Actions */}
            {selectedTask.isActive && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    completeTask(selectedTask.id);
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
