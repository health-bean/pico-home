"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SkeletonCard, Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui";
import { CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DashboardTask {
  id: string;
  name: string;
  category: string;
  priority: "safety" | "prevent_damage" | "efficiency" | "cosmetic";
  nextDueDate: string;
  frequencyValue: number;
  frequencyUnit: string;
}

interface DashboardData {
  home: { id: string; name: string; type: string } | null;
  score: {
    overall: number;
    criticalTasks: number;
    preventiveCare: number;
    homeEfficiency: number;
  } | null;
  overdue: DashboardTask[];
  upcoming: DashboardTask[];
  totalActive: number;
  userName: string;
  completedThisMonth: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function scoreColorClass(score: number): string {
  if (score > 80) return "text-green-600";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function urgencyInfo(task: DashboardTask): {
  label: string;
  stripColor: string;
  badgeBg: string;
  badgeText: string;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(task.nextDueDate + "T00:00:00");
  const diffDays = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      label: "Overdue",
      stripColor: "bg-red-500",
      badgeBg: "bg-red-50",
      badgeText: "text-red-600",
    };
  }
  if (diffDays <= 1) {
    return {
      label: "Today",
      stripColor: "bg-amber-400",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-600",
    };
  }
  if (diffDays <= 7) {
    return {
      label: "Soon",
      stripColor: "bg-amber-400",
      badgeBg: "bg-neutral-100",
      badgeText: "text-neutral-600",
    };
  }
  return {
    label: "Soon",
    stripColor: "bg-neutral-300",
    badgeBg: "bg-neutral-100",
    badgeText: "text-neutral-600",
  };
}

function relativeDueDate(dateStr: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dateStr + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0)
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `Due in ${diffDays} days`;
}

function scoreMessage(score: number): string {
  if (score > 80) return "Looking good! \ud83c\udf89";
  if (score >= 60) return "Room to improve \ud83d\udcaa";
  return "Needs attention \u26a0\ufe0f";
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 py-8 pb-28 bg-[var(--color-neutral-50)] min-h-screen">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-40" />
        </div>
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
      <SkeletonCard className="h-36" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard className="h-24" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score Placeholder
// ---------------------------------------------------------------------------

function ScorePlaceholder() {
  return (
    <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
      <div className="flex items-center gap-5">
        <div className="relative shrink-0 h-[100px] w-[100px]">
          <svg width={100} height={100} viewBox="0 0 100 100" className="-rotate-90">
            <circle cx={50} cy={50} r={42} fill="none" stroke="var(--color-neutral-100)" strokeWidth={8} />
            <circle
              cx={50} cy={50} r={42} fill="none" stroke="var(--color-primary-200)" strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * 0.75}`}
              className="animate-pulse"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-extrabold text-stone-400">...</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-[15px] font-bold text-stone-900">Your score is building...</p>
          <p className="text-xs text-[var(--color-neutral-400)] leading-relaxed">
            As tasks come due and you complete them, your home health score will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [showWelcome, setShowWelcome] = useState(false);

  const greeting = useMemo(() => getGreeting(), []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!localStorage.getItem("pico_welcome_dismissed")) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    localStorage.setItem("pico_welcome_dismissed", "1");
  }, []);

  async function completeTask(taskId: string) {
    setCompletingIds((prev) => new Set(prev).add(taskId));
    try {
      const res = await fetch(`/api/tasks/${taskId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed to complete task");
      await fetchDashboard();
      toast("Task completed!", "success");
    } catch {
      toast("Failed to complete task", "error");
    } finally {
      setCompletingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  // Loading state
  if (loading) return <DashboardSkeleton />;

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-8 bg-[var(--color-neutral-50)] min-h-screen">
        <EmptyState
          title="Something went wrong"
          description={error}
          action={{
            label: "Retry",
            onClick: () => {
              setLoading(true);
              fetchDashboard();
            },
          }}
        />
      </div>
    );
  }

  // No home set up — send to onboarding
  if (!data?.home) {
    router.replace("/onboarding");
    return <DashboardSkeleton />;
  }

  const { score, overdue, upcoming } = data;

  // Combine all tasks that need attention (overdue first, then upcoming)
  const needsAttention = [...overdue, ...upcoming];

  // Stats for "This Month" card
  const completedCount = data.completedThisMonth;
  const remainingCount = upcoming.length + overdue.length;


  return (
    <div className="mx-auto max-w-lg space-y-6 px-5 py-8 pb-28 bg-[var(--color-neutral-50)] min-h-screen font-[family-name:var(--font-plus-jakarta-sans)]">
      {/* ---- Header ---- */}
      <div>
        <p className="text-sm font-medium text-[var(--color-neutral-400)]">
          {greeting}
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-stone-900">
          {data.home.name}
        </h1>
      </div>

      {/* ---- Welcome Nudge Card ---- */}
      {showWelcome && !score && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 relative">
          <button
            onClick={dismissWelcome}
            className="absolute top-3 right-3 text-amber-400 hover:text-amber-600"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="text-[15px] font-bold text-stone-900 mb-2">Welcome to Pico Home!</h3>
          <p className="text-xs text-stone-600 leading-relaxed mb-3">
            We&apos;ve created a maintenance plan based on your home. Here are a few things you can do:
          </p>
          <ul className="space-y-1.5 text-xs text-stone-600">
            <li className="flex items-center gap-2">
              <span className="text-amber-500 font-bold">1.</span>
              <span>Mark tasks you&apos;ve already done with the date you last did them</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-500 font-bold">2.</span>
              <span>Add any systems or appliances we missed from your home profile</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-500 font-bold">3.</span>
              <span>Set up notifications so you never miss a task</span>
            </li>
          </ul>
        </div>
      )}

      {/* ---- Health Score Card ---- */}
      {score ? (() => {
        const categories = [
          { label: "Safety", score: score.criticalTasks },
          { label: "Prevention", score: score.preventiveCare },
          { label: "Efficiency", score: score.homeEfficiency },
        ];
        const RING_SIZE = 100;
        const RING_RADIUS = 42;
        const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
        const RING_OFFSET = RING_CIRCUMFERENCE * (1 - score.overall / 100);
        return (
          <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
            <div className="flex items-center gap-5">
              {/* Circular progress ring */}
              <div className="relative shrink-0 h-[100px] w-[100px]">
                <svg
                  width={RING_SIZE}
                  height={RING_SIZE}
                  viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                  className="-rotate-90"
                >
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="var(--color-neutral-100)"
                    strokeWidth={8}
                  />
                  <circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RING_RADIUS}
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={RING_OFFSET}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                {/* Center text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-extrabold text-stone-900">
                    {score.overall}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-neutral-400)]">
                    Health
                  </span>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="flex flex-1 flex-col gap-1">
                <p className="text-[15px] font-bold text-stone-900 mb-2">
                  {scoreMessage(score.overall)}
                </p>
                {categories.map((cat) => (
                  <div key={cat.label} className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">{cat.label}</span>
                    <span
                      className={`text-xs font-bold ${scoreColorClass(cat.score)}`}
                    >
                      {cat.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })() : <ScorePlaceholder />}

      {/* ---- Needs Attention ---- */}
      {needsAttention.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[15px] font-bold text-stone-900">
              Needs Attention
            </h2>
            <span className="inline-flex items-center justify-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
              {needsAttention.length}
            </span>
          </div>
          <div className="space-y-3">
            {needsAttention.map((task) => {
              const isCompleting = completingIds.has(task.id);
              const urgency = urgencyInfo(task);
              const dueMeta = relativeDueDate(task.nextDueDate);
              const isOverdue = urgency.label === "Overdue";
              const isToday = urgency.label === "Today";

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-3.5"
                >
                  {/* Urgency color strip */}
                  <div
                    className={`h-8 w-1 shrink-0 rounded-full ${urgency.stripColor}`}
                  />

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => completeTask(task.id)}
                    disabled={isCompleting}
                    aria-label="Mark complete"
                    className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isCompleting
                        ? "border-neutral-200 bg-neutral-100 animate-pulse"
                        : isOverdue || isToday
                          ? "border-amber-400 bg-transparent hover:border-amber-500 hover:bg-amber-50"
                          : "border-neutral-300 bg-transparent hover:border-amber-400 hover:bg-amber-50/50"
                    }`}
                  >
                    {isCompleting && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-spin text-neutral-400"
                      >
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                    )}
                  </button>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-900 truncate">
                      {task.name}
                    </p>
                    <p className="text-xs text-[var(--color-neutral-400)] mt-0.5">
                      {dueMeta} &middot; Every {task.frequencyValue}{" "}
                      {task.frequencyUnit}
                    </p>
                  </div>

                  {/* Urgency badge */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${urgency.badgeBg} ${urgency.badgeText}`}
                  >
                    {urgency.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty state when nothing needs attention */}
      {needsAttention.length === 0 && (
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-2" />
          <p className="text-sm font-semibold text-stone-900">
            {score ? "All caught up!" : "You're all set for now"}
          </p>
          <p className="text-xs text-[var(--color-neutral-400)] mt-1">
            {score
              ? "No tasks need your attention right now."
              : "We'll let you know when your first tasks are due."}
          </p>
        </div>
      )}

      {/* ---- This Month Card ---- */}
      <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5">
        <div className="flex items-center">
          {/* Completed */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-2xl font-extrabold text-stone-900">
              {completedCount}
            </span>
            <span className="text-[11px] font-semibold uppercase text-[var(--color-neutral-400)]">
              Completed
            </span>
          </div>

          {/* Divider */}
          <div className="h-10 w-px bg-neutral-200" />

          {/* Remaining */}
          <div className="flex flex-1 flex-col items-center gap-1">
            <span className="text-2xl font-extrabold text-amber-500">
              {remainingCount}
            </span>
            <span className="text-[11px] font-semibold uppercase text-[var(--color-neutral-400)]">
              Remaining
            </span>
          </div>
        </div>
      </div>

      {/* ---- View All Tasks Link ---- */}
      <Link
        href="/tasks"
        className="block text-center text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
      >
        View all tasks
      </Link>
    </div>
  );
}
