"use client";

import { useState, useCallback } from "react";
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Select,
  Dialog,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Priority = "low" | "medium" | "high" | "urgent";
type TaskStatus = "overdue" | "due_soon" | "upcoming" | "completed" | "skipped";
type Category =
  | "hvac"
  | "plumbing"
  | "electrical"
  | "exterior"
  | "appliance"
  | "safety"
  | "lawn"
  | "cleaning";

interface Task {
  id: string;
  name: string;
  description: string;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  dueDate: string; // ISO date
  estimatedTime: string;
  estimatedCost: string;
  difficulty: "Easy" | "Moderate" | "Hard";
  frequency: string;
  whyItMatters: string;
  tips: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const today = new Date("2026-03-16");

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function dueDateLabel(dateStr: string): { text: string; color: string } {
  const diff = daysUntil(dateStr);
  if (diff < 0)
    return {
      text: `${Math.abs(diff)} day${Math.abs(diff) > 1 ? "s" : ""} overdue`,
      color: "text-red-600 dark:text-red-400",
    };
  if (diff === 0) return { text: "Due today", color: "text-amber-600 dark:text-amber-400" };
  if (diff <= 7)
    return {
      text: `Due in ${diff} day${diff > 1 ? "s" : ""}`,
      color: "text-amber-600 dark:text-amber-400",
    };
  return {
    text: new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    color: "text-muted-foreground",
  };
}

const categoryLabels: Record<Category, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  exterior: "Exterior",
  appliance: "Appliance",
  safety: "Safety",
  lawn: "Lawn & Garden",
  cleaning: "Cleaning",
};

const categoryBadgeVariant: Record<Category, "default" | "success" | "warning" | "danger" | "info"> = {
  hvac: "info",
  plumbing: "info",
  electrical: "warning",
  exterior: "success",
  appliance: "default",
  safety: "danger",
  lawn: "success",
  cleaning: "default",
};

const priorityIndicator: Record<Priority, { label: string; classes: string }> = {
  urgent: { label: "Urgent", classes: "bg-red-500" },
  high: { label: "High", classes: "bg-orange-500" },
  medium: { label: "Med", classes: "bg-amber-400" },
  low: { label: "Low", classes: "bg-green-400" },
};

const difficultyColor: Record<string, string> = {
  Easy: "text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-950",
  Moderate: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950",
  Hard: "text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950",
};

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const initialTasks: Task[] = [
  {
    id: "1",
    name: "Replace HVAC Air Filter",
    description:
      "Swap the current HVAC air filter for a new MERV-11 or higher rated filter. Check the size printed on the existing filter before purchasing.",
    category: "hvac",
    priority: "high",
    status: "overdue",
    dueDate: "2026-03-13",
    estimatedTime: "10 min",
    estimatedCost: "$15 - $30",
    difficulty: "Easy",
    frequency: "Every 90 days",
    whyItMatters:
      "A clogged filter forces your HVAC system to work harder, increasing energy bills by up to 15% and reducing indoor air quality.",
    tips: "Set a recurring reminder. Buy filters in bulk (3-pack) to save money and always have one ready.",
  },
  {
    id: "2",
    name: "Test Smoke & CO Detectors",
    description:
      "Press the test button on every smoke and carbon monoxide detector in the home. Replace batteries if the alarm is weak or absent.",
    category: "safety",
    priority: "urgent",
    status: "overdue",
    dueDate: "2026-03-10",
    estimatedTime: "15 min",
    estimatedCost: "$0 - $10",
    difficulty: "Easy",
    frequency: "Monthly",
    whyItMatters:
      "Working detectors reduce the risk of fire and CO-related fatalities by over 50%. Dead batteries are the #1 reason detectors fail.",
    tips: "Walk through every level of the home. Replace any detector older than 10 years regardless of battery status.",
  },
  {
    id: "3",
    name: "Clean Gutters & Downspouts",
    description:
      "Remove leaves and debris from all gutters. Flush downspouts with a garden hose to ensure proper drainage away from the foundation.",
    category: "exterior",
    priority: "high",
    status: "due_soon",
    dueDate: "2026-03-18",
    estimatedTime: "1 - 2 hrs",
    estimatedCost: "$0 (DIY) / $150+ (pro)",
    difficulty: "Moderate",
    frequency: "Twice yearly",
    whyItMatters:
      "Clogged gutters cause water to pool near the foundation, leading to basement leaks, mold, and expensive structural damage.",
    tips: "Use a gutter scoop and wear gloves. Consider installing gutter guards to reduce future buildup.",
  },
  {
    id: "4",
    name: "Inspect Washing Machine Hoses",
    description:
      "Check both hot and cold supply hoses for cracks, bulges, or signs of wear. Replace rubber hoses with braided stainless steel.",
    category: "appliance",
    priority: "medium",
    status: "due_soon",
    dueDate: "2026-03-20",
    estimatedTime: "15 min",
    estimatedCost: "$15 - $25",
    difficulty: "Easy",
    frequency: "Every 6 months",
    whyItMatters:
      "A burst washing machine hose is one of the most common causes of home water damage, averaging $5,000+ in repairs.",
    tips: "Turn off water supply valves when the machine is not in use for extended periods. Replace hoses every 5 years.",
  },
  {
    id: "5",
    name: "Fertilize & Treat Lawn",
    description:
      "Apply a spring fertilizer with pre-emergent weed control. Follow the coverage rates on the product label for your yard size.",
    category: "lawn",
    priority: "medium",
    status: "due_soon",
    dueDate: "2026-03-22",
    estimatedTime: "45 min",
    estimatedCost: "$25 - $50",
    difficulty: "Easy",
    frequency: "Quarterly",
    whyItMatters:
      "Spring is the key window for weed prevention. A healthy lawn resists pests and disease and boosts curb appeal.",
    tips: "Water lightly after application. Avoid mowing for 48 hours so the treatment can soak in.",
  },
  {
    id: "6",
    name: "Flush Water Heater",
    description:
      "Attach a garden hose to the drain valve and flush sediment from the tank until the water runs clear. Check the anode rod condition.",
    category: "plumbing",
    priority: "medium",
    status: "upcoming",
    dueDate: "2026-04-01",
    estimatedTime: "30 - 45 min",
    estimatedCost: "$0 (DIY)",
    difficulty: "Moderate",
    frequency: "Annually",
    whyItMatters:
      "Sediment buildup reduces heating efficiency and can shorten the tank's lifespan by several years.",
    tips: "Turn off the heater and let water cool before draining. If the anode rod is heavily corroded, replace it (~$25).",
  },
  {
    id: "7",
    name: "Seal Driveway Cracks",
    description:
      "Clean out debris from cracks wider than 1/4 inch and fill with concrete crack filler or asphalt patch. Smooth and let cure.",
    category: "exterior",
    priority: "low",
    status: "upcoming",
    dueDate: "2026-04-10",
    estimatedTime: "1 - 2 hrs",
    estimatedCost: "$10 - $30",
    difficulty: "Easy",
    frequency: "Annually",
    whyItMatters:
      "Water seeps into cracks, freezes, and expands, turning small cracks into costly full-width breaks over winter.",
    tips: "Work on a dry day above 50 degrees F. Apply sealcoat over the entire surface every 2 - 3 years for maximum protection.",
  },
  {
    id: "8",
    name: "Deep Clean Range Hood Filter",
    description:
      "Remove the metal mesh filter and soak in hot water with degreasing dish soap for 15 min. Scrub with a brush, rinse, and air dry.",
    category: "cleaning",
    priority: "low",
    status: "upcoming",
    dueDate: "2026-04-15",
    estimatedTime: "20 min",
    estimatedCost: "$0",
    difficulty: "Easy",
    frequency: "Every 3 months",
    whyItMatters:
      "A grease-clogged filter reduces ventilation, increases cooking odors, and can become a fire hazard on high heat.",
    tips: "If the filter is warped or heavily discolored, replacements are usually under $15 from the manufacturer.",
  },
  {
    id: "9",
    name: "Check Exterior Caulking",
    description:
      "Inspect caulk around windows, doors, and trim. Remove cracked or peeling caulk and reapply with exterior-grade silicone or polyurethane.",
    category: "exterior",
    priority: "medium",
    status: "upcoming",
    dueDate: "2026-04-20",
    estimatedTime: "1 - 2 hrs",
    estimatedCost: "$10 - $20",
    difficulty: "Easy",
    frequency: "Annually",
    whyItMatters:
      "Failed caulk lets moisture and air infiltrate, increasing energy costs and inviting water damage and pests.",
    tips: "Use painter's tape on both sides of the joint for a clean line. A wet finger or caulk tool gives the best finish.",
  },
  {
    id: "10",
    name: "Test GFCI Outlets",
    description:
      "Press the TEST button on each GFCI outlet. The power should cut off. Press RESET to restore. Replace any outlet that fails the test.",
    category: "electrical",
    priority: "high",
    status: "due_soon",
    dueDate: "2026-03-19",
    estimatedTime: "10 min",
    estimatedCost: "$0 - $15",
    difficulty: "Easy",
    frequency: "Monthly",
    whyItMatters:
      "GFCI outlets prevent electrical shock in wet areas like kitchens and bathrooms. A failed outlet offers no protection.",
    tips: "Check outlets in kitchens, bathrooms, garages, and outdoor areas. If one trips and won't reset, call an electrician.",
  },
];

// ---------------------------------------------------------------------------
// Filter pills
// ---------------------------------------------------------------------------

type FilterKey = "all" | "overdue" | "due_soon" | "upcoming" | "completed";

const filterOptions: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "overdue", label: "Overdue" },
  { key: "due_soon", label: "Due Soon" },
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
];

// ---------------------------------------------------------------------------
// Icons (inline SVGs)
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

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);

  // Add-task form state
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("hvac");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [newFrequency, setNewFrequency] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const completeTask = useCallback((id: string) => {
    setCompleting(id);
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: "completed" as TaskStatus } : t))
      );
      setCompleting(null);
    }, 400);
  }, []);

  const skipTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "skipped" as TaskStatus } : t))
    );
  }, []);

  const snoozeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const d = new Date(t.dueDate);
        d.setDate(d.getDate() + 7);
        const newDate = d.toISOString().split("T")[0];
        const diff = daysUntil(newDate);
        const newStatus: TaskStatus = diff < 0 ? "overdue" : diff <= 7 ? "due_soon" : "upcoming";
        return { ...t, dueDate: newDate, status: newStatus };
      })
    );
  }, []);

  const handleAddTask = useCallback(() => {
    if (!newName.trim()) return;
    setAddOpen(false);
    setNewName("");
    setNewCategory("hvac");
    setNewPriority("medium");
    setNewFrequency("");
    setNewNotes("");
  }, [newName]);

  // -----------------------------------------------------------------------
  // Filtering & grouping
  // -----------------------------------------------------------------------

  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "skipped");

  const filtered = (() => {
    if (filter === "all") return tasks;
    if (filter === "completed")
      return tasks.filter((t) => t.status === "completed" || t.status === "skipped");
    return tasks.filter((t) => t.status === filter);
  })();

  const overdue = filtered.filter((t) => t.status === "overdue");
  const dueSoon = filtered.filter((t) => t.status === "due_soon");
  const upcoming = filtered.filter((t) => t.status === "upcoming");
  const completed = filtered.filter(
    (t) => t.status === "completed" || t.status === "skipped"
  );

  // Sort each group by date
  const byDate = (a: Task, b: Task) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();

  overdue.sort(byDate);
  dueSoon.sort(byDate);
  upcoming.sort(byDate);
  completed.sort(byDate);

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------

  function renderTaskCard(task: Task, accentClass: string) {
    const due = dueDateLabel(task.dueDate);
    const pri = priorityIndicator[task.priority];
    const isCompleting = completing === task.id;

    return (
      <Card
        key={task.id}
        className={`border-l-4 ${accentClass} transition-all duration-300 ${
          isCompleting ? "opacity-30 scale-95" : "opacity-100"
        } ${task.status === "completed" || task.status === "skipped" ? "opacity-60" : ""}`}
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
                <Badge variant={categoryBadgeVariant[task.category]} size="sm">
                  {categoryLabels[task.category]}
                </Badge>
                <span className={`text-xs font-medium ${due.color}`}>{due.text}</span>
              </div>

              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${pri.classes}`}
                    title={pri.label}
                  />
                  {pri.label}
                </span>
                <span className="flex items-center gap-1">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {task.estimatedTime}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            {task.status !== "completed" && task.status !== "skipped" && (
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={() => completeTask(task.id)}
                  className="flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900"
                  title="Complete"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Done
                </button>
                <button
                  onClick={() => skipTask(task.id)}
                  className="flex items-center gap-1 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  title="Skip"
                >
                  <SkipIcon className="h-3.5 w-3.5" />
                  Skip
                </button>
                <button
                  onClick={() => snoozeTask(task.id)}
                  className="flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
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
    borderClass: string
  ) {
    if (items.length === 0) return null;
    return (
      <section className="space-y-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wider ${borderClass}`}>
          {title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">({items.length})</span>
        </h2>
        <div className="space-y-3">
          {items.map((task) => renderTaskCard(task, accentClass))}
        </div>
      </section>
    );
  }

  // -----------------------------------------------------------------------
  // JSX
  // -----------------------------------------------------------------------

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
            const count =
              opt.key === "all"
                ? activeTasks.length
                : opt.key === "completed"
                  ? tasks.filter((t) => t.status === "completed" || t.status === "skipped").length
                  : tasks.filter((t) => t.status === opt.key).length;
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
        {filter === "all" || filter === "overdue"
          ? renderSection("Overdue", overdue, "border-l-red-500", "text-red-600 dark:text-red-400")
          : null}

        {filter === "all" || filter === "due_soon"
          ? renderSection(
              "Due This Week",
              dueSoon,
              "border-l-amber-400",
              "text-amber-600 dark:text-amber-400"
            )
          : null}

        {filter === "all" || filter === "upcoming"
          ? renderSection(
              "Upcoming",
              upcoming,
              "border-l-gray-300 dark:border-l-neutral-600",
              "text-muted-foreground"
            )
          : null}

        {(filter === "all" || filter === "completed") && completed.length > 0
          ? renderSection(
              "Completed / Skipped",
              completed,
              "border-l-green-300 dark:border-l-green-800",
              "text-green-600 dark:text-green-400"
            )
          : null}

        {/* Empty state for filtered views */}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-full bg-muted p-4">
              <CheckIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No tasks here</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              {filter === "completed"
                ? "You haven't completed any tasks yet. Get started!"
                : "All caught up! No tasks match this filter."}
            </p>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Task Detail Dialog                                                 */}
      {/* ----------------------------------------------------------------- */}
      <Dialog
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.name}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-5 mt-2">
            <p className="text-sm text-muted-foreground">{selectedTask.description}</p>

            <div className="flex flex-wrap gap-2">
              <Badge variant={categoryBadgeVariant[selectedTask.category]} size="md">
                {categoryLabels[selectedTask.category]}
              </Badge>
              <Badge
                variant={
                  selectedTask.priority === "urgent" || selectedTask.priority === "high"
                    ? "danger"
                    : selectedTask.priority === "medium"
                      ? "warning"
                      : "success"
                }
                size="md"
              >
                {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)} Priority
              </Badge>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${difficultyColor[selectedTask.difficulty]}`}
              >
                {selectedTask.difficulty} DIY
              </span>
            </div>

            {/* Why it matters */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Why It Matters</h4>
              <p className="text-sm text-muted-foreground">{selectedTask.whyItMatters}</p>
            </div>

            {/* Tips */}
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1">Tips</h4>
              <p className="text-sm text-muted-foreground">{selectedTask.tips}</p>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
              <div>
                <p className="text-xs text-muted-foreground">Estimated Time</p>
                <p className="text-sm font-medium text-foreground">{selectedTask.estimatedTime}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimated Cost</p>
                <p className="text-sm font-medium text-foreground">{selectedTask.estimatedCost}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Frequency</p>
                <p className="text-sm font-medium text-foreground">{selectedTask.frequency}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Due Date</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(selectedTask.dueDate).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Actions */}
            {selectedTask.status !== "completed" && selectedTask.status !== "skipped" && (
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

      {/* ----------------------------------------------------------------- */}
      {/* Add Task Dialog                                                    */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Task" size="md">
        <div className="space-y-4 mt-2">
          <Input
            label="Task Name"
            placeholder="e.g. Clean dryer vent"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <Select
            label="Category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Category)}
            options={Object.entries(categoryLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />

          <Select
            label="Priority"
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as Priority)}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "urgent", label: "Urgent" },
            ]}
          />

          <Input
            label="Frequency"
            placeholder="e.g. Every 6 months"
            value={newFrequency}
            onChange={(e) => setNewFrequency(e.target.value)}
          />

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
            <Button variant="primary" className="flex-1" onClick={handleAddTask}>
              Save Task
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
