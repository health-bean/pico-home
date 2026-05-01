"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Check,
  Home,
  Shield,
  Thermometer,
  Droplet,
  Zap,
  Refrigerator,
  Wind,
  Fence,
} from "lucide-react";
import {
  EmptyState,
  SkeletonCard,
  useToast,
} from "@/components/ui";
import {
  type Task,
  type FilterKey,
  type StatusGroup,
  getToday,
  daysBetween,
  getStatusGroup,
  relativeDueLabel,
  getCategoryLabel,
  SUBGROUP_LABELS,
  FLAT_CATEGORIES,
  priorityLabels,
  filterOptions,
} from "./task-constants";
import { TaskDetailDialog } from "./task-detail-dialog";
import { AddTaskDialog } from "./add-task-dialog";

// ---------------------------------------------------------------------------
// Category icons (kept here because they reference React/Lucide components)
// ---------------------------------------------------------------------------

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
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

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
  // Actions (stay here because they need fetchTasks)
  // -------------------------------------------------------------------------

  const completeTask = useCallback(
    async (id: string, completedDate?: string) => {
      setActionLoading(id);
      try {
        const body: Record<string, unknown> = {};
        if (completedDate) body.completedDate = completedDate;
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

  const dismissTask = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/tasks/${id}/dismiss`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error("Failed to dismiss task");
        toast("Task dismissed — it won't appear again", "success");
        await fetchTasks();
      } catch {
        toast("Failed to dismiss task", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks, toast]
  );

  const restoreTask = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        const res = await fetch(`/api/tasks/${id}/restore`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!res.ok) throw new Error("Failed to restore task");
        toast("Task restored", "success");
        await fetchTasks();
      } catch {
        toast("Failed to restore task", "error");
      } finally {
        setActionLoading(null);
      }
    },
    [fetchTasks, toast]
  );

  // -------------------------------------------------------------------------
  // Filtering & grouping
  // -------------------------------------------------------------------------

  const activeTasks = tasks.filter((t) => t.isActive);
  const completedTasks = tasks.filter((t) => !t.isActive && !t.dismissedAt);
  const dismissedTasks = tasks.filter((t) => !t.isActive && t.dismissedAt);

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
    dismissed: dismissedTasks.length,
  };

  completedTasks.sort(byDate);

  // Auto-expand urgent categories on mount
  useEffect(() => {
    if (activeTasks.length === 0) return;
    const urgent = new Set<string>();
    for (const task of activeTasks) {
      const diff = daysBetween(task.nextDueDate, today);
      if (diff <= 7) urgent.add(task.category);
    }
    setExpandedCategories(urgent);
  }, [tasks.length]); // eslint-disable-line react-hooks/exhaustive-deps

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

        <AddTaskDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onTaskAdded={fetchTasks}
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
        {filter !== "completed" && filter !== "dismissed" && sortedCategories.map((cat) => renderCategorySection(cat, tasksByCategory[cat]))}
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
        {filter === "dismissed" && dismissedTasks.length > 0 && (
          <section className="mb-5">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-2.5 text-[var(--color-neutral-400)]">
              Dismissed <span className="ml-1.5 text-[11px] font-normal opacity-60">({dismissedTasks.length})</span>
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Tasks you marked as not relevant. Tap to restore.</p>
            <div className="flex flex-col gap-2">
              {dismissedTasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => restoreTask(task.id)}
                  disabled={actionLoading === task.id}
                  className={`w-full bg-white rounded-2xl border border-[var(--color-neutral-200)] p-3.5 flex items-center gap-3 text-left opacity-60 hover:opacity-100 transition-all ${
                    actionLoading === task.id ? "opacity-30 scale-95" : ""
                  }`}
                >
                  <div className="w-1 h-8 rounded-full shrink-0 bg-[var(--color-neutral-200)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-neutral-900)] truncate">{task.name}</p>
                    <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">{getCategoryLabel(task.category)}</p>
                  </div>
                  <span className="text-xs font-medium text-[var(--color-primary-600)] shrink-0">Restore</span>
                </button>
              ))}
            </div>
          </section>
        )}
        {filter === "overdue" && overdueCount === 0 && <EmptyState icon={<Check className="h-8 w-8" />} title="No overdue tasks" description="You're all caught up!" />}
        {filter === "due_soon" && dueSoonCount === 0 && <EmptyState icon={<Check className="h-8 w-8" />} title="Nothing due soon" description="No tasks due in the next 7 days." />}
        {filter === "completed" && completedTasks.length === 0 && <EmptyState icon={<Check className="h-8 w-8" />} title="No completed tasks" description="You haven't completed any tasks yet." />}
        {filter === "dismissed" && dismissedTasks.length === 0 && <EmptyState icon={<Check className="h-8 w-8" />} title="No dismissed tasks" description="You haven't dismissed any tasks." />}
      </div>

      {/* Task Detail Dialog */}
      <TaskDetailDialog
        task={selectedTask}
        onClose={() => {
          setSelectedTask(null);
          fetchTasks();
        }}
        onComplete={completeTask}
        onSkip={skipTask}
        onSnooze={snoozeTask}
        onDismiss={dismissTask}
        actionLoading={actionLoading}
      />

      {/* Add Task Dialog */}
      <AddTaskDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onTaskAdded={fetchTasks}
      />
    </div>
  );
}
