"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
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
      color: "text-red-600 dark:text-red-400",
    };
  }
  if (diff === -1) {
    return {
      text: "1 day overdue",
      color: "text-red-600 dark:text-red-400",
    };
  }
  if (diff === 0) {
    return { text: "Due today", color: "text-amber-600 dark:text-amber-400" };
  }
  if (diff === 1) {
    return { text: "Due tomorrow", color: "text-amber-600 dark:text-amber-400" };
  }
  if (diff <= 7) {
    return {
      text: `Due in ${diff} days`,
      color: "text-amber-600 dark:text-amber-400",
    };
  }
  if (diff <= 14) {
    const weeks = Math.round(diff / 7);
    return {
      text: `Due in ${weeks} week${weeks > 1 ? "s" : ""}`,
      color: "text-muted-foreground",
    };
  }
  return {
    text: `Due in ${diff} days`,
    color: "text-muted-foreground",
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

const priorityDot: Record<string, string> = {
  safety: "bg-red-500",
  prevent_damage: "bg-orange-500",
  efficiency: "bg-amber-400",
  cosmetic: "bg-green-400",
};

const filterOptions: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due Soon" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

// ---------------------------------------------------------------------------
// Inline SVG Icons
// ---------------------------------------------------------------------------

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SkipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}

function SnoozeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

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

  function renderTaskCard(task: Task, accentClass: string) {
    const due = relativeDueLabel(task.nextDueDate, today);
    const priLabel = priorityLabels[task.priority] || task.priority;
    const priDot = priorityDot[task.priority] || "bg-gray-400";
    const isActioning = actionLoading === task.id;

    return (
      <Card
        key={task.id}
        className={`border-l-4 ${accentClass} transition-all duration-300 ${
          isActioning ? "opacity-30 scale-95" : "opacity-100"
        } ${!task.isActive ? "opacity-60" : ""}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Left content */}
            <div className="flex-1 min-w-0">
              <button
                className="text-left font-semibold text-foreground hover:text-primary transition-colors text-base leading-snug"
                onClick={() => setSelectedTask(task)}
              >
                {task.name}
              </button>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant={categoryBadgeVariant[task.category] || "default"}
                  size="sm"
                >
                  {categoryLabels[task.category] || task.category}
                </Badge>
                <span className={`text-xs font-medium ${due.color}`}>{due.text}</span>
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${priDot}`}
                    title={priLabel}
                  />
                  {priLabel}
                </span>
                <span>
                  Every {task.frequencyValue} {task.frequencyUnit}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {task.isActive && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => completeTask(task.id)}
                  disabled={isActioning}
                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 disabled:opacity-50"
                  title="Complete"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Done
                </button>
                <button
                  onClick={() => skipTask(task.id)}
                  disabled={isActioning}
                  className="flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50"
                  title="Skip"
                >
                  <SkipIcon className="h-3.5 w-3.5" />
                  Skip
                </button>
                <button
                  onClick={() => snoozeTask(task.id)}
                  disabled={isActioning}
                  className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 disabled:opacity-50"
                  title="Snooze 7 days"
                >
                  <SnoozeIcon className="h-3.5 w-3.5" />
                  Snooze
                </button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderSection(
    title: string,
    items: Task[],
    accentClass: string,
    titleColor: string
  ) {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${titleColor}`}>
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            ({items.length})
          </span>
        </h2>
        <div className="space-y-3">
          {items.map((task) => renderTaskCard(task, accentClass))}
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
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-muted" />
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
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        </div>
        <EmptyState
          icon={<HomeIcon className="h-10 w-10" />}
          title="No tasks yet"
          description="Complete onboarding to get personalized maintenance tasks for your home."
          action={{
            label: "Start Onboarding",
            onClick: () => router.push("/onboarding"),
            variant: "primary",
          }}
        />
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
        <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <FilterIcon className="h-5 w-5" />
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <PlusIcon className="h-4 w-4" />
            Add Task
          </Button>
        </div>
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
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 text-xs ${isActive ? "text-white/80" : "text-muted-foreground"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Task sections */}
      <div className="space-y-8">
        {(filter === "all" || filter === "overdue") &&
          renderSection(
            "Overdue",
            grouped.overdue,
            "border-l-red-500",
            "text-red-600 dark:text-red-400"
          )}

        {(filter === "all" || filter === "due_soon") &&
          renderSection(
            "Due This Week",
            grouped.due_soon,
            "border-l-amber-400",
            "text-amber-600 dark:text-amber-400"
          )}

        {(filter === "all" || filter === "upcoming") &&
          renderSection(
            "Upcoming",
            grouped.upcoming,
            "border-l-gray-300 dark:border-l-neutral-600",
            "text-muted-foreground"
          )}

        {(filter === "all" || filter === "completed") &&
          completedTasks.length > 0 &&
          renderSection(
            "Completed",
            completedTasks,
            "border-l-green-300 dark:border-l-green-800",
            "text-green-600 dark:text-green-400"
          )}

        {/* Empty state for filtered views */}
        {filter === "overdue" && grouped.overdue.length === 0 && (
          <EmptyState
            icon={<CheckIcon className="h-8 w-8" />}
            title="No overdue tasks"
            description="You're all caught up! No tasks are past due."
          />
        )}
        {filter === "due_soon" && grouped.due_soon.length === 0 && (
          <EmptyState
            icon={<CheckIcon className="h-8 w-8" />}
            title="Nothing due soon"
            description="No tasks are due in the next 7 days."
          />
        )}
        {filter === "upcoming" && grouped.upcoming.length === 0 && (
          <EmptyState
            icon={<CheckIcon className="h-8 w-8" />}
            title="No upcoming tasks"
            description="No tasks scheduled beyond this week."
          />
        )}
        {filter === "completed" && completedTasks.length === 0 && (
          <EmptyState
            icon={<CheckIcon className="h-8 w-8" />}
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
                  <CheckIcon className="h-4 w-4" />
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
                  <SkipIcon className="h-4 w-4" />
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
                  <SnoozeIcon className="h-4 w-4" />
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
              className="flex min-h-[80px] w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-[var(--color-neutral-900)]"
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
      </Dialog>
    </div>
  );
}
