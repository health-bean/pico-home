"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { SkeletonCard, Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

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
  };
  overdue: DashboardTask[];
  upcoming: DashboardTask[];
  totalActive: number;
  userName: string;
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

function getSeasonalTip(): { title: string; body: string } {
  const month = new Date().getMonth();
  const tips: Record<number, { title: string; body: string }> = {
    0: { title: "Winter Watch", body: "Check for ice dams along your roof edges and clear snow from foundation vents to prevent moisture buildup." },
    1: { title: "Pre-Spring Prep", body: "Test your sump pump before spring thaw. Pour a bucket of water into the pit to make sure it activates." },
    2: { title: "Spring Kickoff", body: "Inspect your roof for winter damage -- missing or curled shingles can lead to costly leaks." },
    3: { title: "Gutter Season", body: "Clean gutters and downspouts now. Ensure water drains at least 4 feet away from your foundation." },
    4: { title: "HVAC Tune-Up", body: "Schedule your AC maintenance before the summer rush. Replace filters and clear debris around the outdoor unit." },
    5: { title: "Summer Ready", body: "Inspect window and door caulking. Failing seals let cool air escape and drive up energy bills." },
    6: { title: "Mid-Summer Check", body: "Test your irrigation system for leaks and adjust sprinkler heads to avoid watering the sidewalk." },
    7: { title: "Beat the Heat", body: "Clean your dryer vent -- lint buildup is a top cause of house fires and summer heat makes it worse." },
    8: { title: "Fall Prep", body: "Drain and winterize outdoor faucets before the first freeze. A burst pipe can cost thousands." },
    9: { title: "Heating Ready", body: "Schedule a furnace inspection and replace your HVAC filter. Aim for a clean filter every 90 days." },
    10: { title: "Weatherization", body: "Add weatherstripping to doors and windows. You can lose 25-30% of heating energy through air leaks." },
    11: { title: "Year-End Review", body: "Test all smoke and CO detectors, replace batteries, and check fire extinguisher expiration dates." },
  };
  return tips[month];
}

function scoreVariant(score: number): "success" | "warning" | "danger" {
  if (score > 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

function scoreColor(score: number): string {
  if (score > 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}

function scoreTrackColor(score: number): string {
  if (score > 80) return "stroke-success";
  if (score >= 60) return "stroke-warning";
  return "stroke-danger";
}

function relativeDueDate(dateStr: string): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(dateStr + "T00:00:00");
  const diffMs = due.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

const PRIORITY_CONFIG: Record<
  string,
  { label: string; variant: "danger" | "warning" | "info" | "default" }
> = {
  safety: { label: "Safety", variant: "danger" },
  prevent_damage: { label: "Preventive", variant: "warning" },
  efficiency: { label: "Efficiency", variant: "info" },
  cosmetic: { label: "Cosmetic", variant: "default" },
};

const HEALTH_GOALS = [
  { key: "clean_air", label: "Clean Air", icon: "\uD83D\uDCA8", color: "bg-sky-50 dark:bg-sky-950 border-sky-200 dark:border-sky-800" },
  { key: "clean_water", label: "Clean Water", icon: "\uD83D\uDCA7", color: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800" },
  { key: "mold_prevention", label: "Mold Prevention", icon: "\uD83D\uDEE1\uFE0F", color: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800" },
  { key: "fire_safety", label: "Fire Safety", icon: "\uD83D\uDD25", color: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800" },
  { key: "pest_free", label: "Pest-Free", icon: "\uD83D\uDC1B", color: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800" },
  { key: "injury_prevention", label: "Injury Prevention", icon: "\u26A0\uFE0F", color: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800" },
];

// ---------------------------------------------------------------------------
// Circular Score Component
// ---------------------------------------------------------------------------

function CircularScore({ score, size = 128 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-muted"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={scoreTrackColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-24">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <SkeletonCard className="h-72" />
      <SkeletonCard className="h-20" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard Page
// ---------------------------------------------------------------------------

type HealthLens = "category" | "health_goal";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [healthLens, setHealthLens] = useState<HealthLens>("category");

  const greeting = useMemo(() => getGreeting(), []);
  const seasonalTip = useMemo(() => getSeasonalTip(), []);

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
    } catch {
      // Silently handle -- could add toast here
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
      <div className="mx-auto max-w-lg px-4 py-6">
        <EmptyState
          title="Something went wrong"
          description={error}
          action={{ label: "Retry", onClick: () => { setLoading(true); fetchDashboard(); } }}
        />
      </div>
    );
  }

  // No home set up
  if (!data?.home) {
    return (
      <div className="mx-auto max-w-lg px-4 py-6">
        <EmptyState
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
          title="Set up your home"
          description="Add your home details to start tracking maintenance tasks and get personalized recommendations."
          action={{ label: "Get Started", onClick: () => router.push("/onboarding") }}
        />
      </div>
    );
  }

  const { score, overdue, upcoming, userName } = data;

  const subScores = [
    { label: "Critical Tasks", score: score.criticalTasks },
    { label: "Preventive Care", score: score.preventiveCare },
    { label: "Home Efficiency", score: score.homeEfficiency },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-24">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {greeting}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here is your home at a glance.
        </p>
      </div>

      {/* ---- Home Upkeep Score ---- */}
      <Card>
        <CardHeader className="items-center pb-2">
          <CardTitle>Home Upkeep Score</CardTitle>
          <CardDescription>How well you&apos;re keeping up with tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <CircularScore score={score.overall} />
          <div className="w-full space-y-3">
            {subScores.map((s) => (
              <Progress
                key={s.label}
                label={s.label}
                value={s.score}
                showPercentage
                variant={scoreVariant(s.score)}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Scores reflect task completion status, not the actual condition of your home.
            Always consult licensed professionals for safety assessments.
          </p>
        </CardContent>
      </Card>

      {/* ---- Health Lens Toggle ---- */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
        <button
          type="button"
          onClick={() => setHealthLens("category")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            healthLens === "category"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          By Category
        </button>
        <button
          type="button"
          onClick={() => setHealthLens("health_goal")}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            healthLens === "health_goal"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          By Health Goal
        </button>
      </div>

      {/* ---- Health Goal View ---- */}
      {healthLens === "health_goal" && (
        <section>
          <div className="grid grid-cols-2 gap-3">
            {HEALTH_GOALS.map((goal) => (
              <Card key={goal.key} className={`border ${goal.color}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{goal.icon}</span>
                    <Badge variant="default" size="sm">Coming soon</Badge>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-foreground">{goal.label}</p>
                  <p className="text-xs text-muted-foreground">-- tasks</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ---- Category View (Overdue + Upcoming) ---- */}
      {healthLens === "category" && (
        <>
          {/* ---- Overdue Tasks Alert ---- */}
          {overdue.length > 0 && (
            <Card className="border-[var(--color-danger-200)] bg-[var(--color-danger-50)] dark:border-red-800 dark:bg-red-950">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger text-white text-sm font-bold">
                    {overdue.length}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-danger-700)] dark:text-red-200">
                      Overdue tasks need attention
                    </p>
                    <p className="text-xs text-[var(--color-danger-600)] dark:text-red-300">
                      Completing these protects your home
                    </p>
                  </div>
                </div>
                <Link href="/tasks">
                  <Button variant="danger" size="sm">
                    View All
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* ---- Upcoming This Week ---- */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Upcoming This Week</h2>
              <Link href="/tasks" className="text-sm font-medium text-primary hover:underline">
                See all
              </Link>
            </div>
            {upcoming.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-sm text-muted-foreground">
                    No upcoming tasks this week. You&apos;re all caught up!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcoming.map((task) => {
                  const isCompleting = completingIds.has(task.id);
                  const dueLabel = relativeDueDate(task.nextDueDate);
                  const priorityCfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.cosmetic;

                  return (
                    <Card key={task.id}>
                      <CardContent className="flex items-start gap-3 p-4">
                        {/* Complete button */}
                        <button
                          type="button"
                          onClick={() => completeTask(task.id)}
                          disabled={isCompleting}
                          aria-label="Mark complete"
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            isCompleting
                              ? "border-muted bg-muted animate-pulse"
                              : "border-border bg-transparent hover:border-primary"
                          }`}
                        >
                          {isCompleting && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="animate-spin text-muted-foreground"
                            >
                              <path d="M12 2a10 10 0 0 1 10 10" />
                            </svg>
                          )}
                        </button>

                        {/* Task details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">
                            {task.name}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Badge variant="default" size="sm">
                              {task.category}
                            </Badge>
                            <Badge variant={priorityCfg.variant} size="sm">
                              {priorityCfg.label}
                            </Badge>
                          </div>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                <line x1="16" y1="2" x2="16" y2="6" />
                                <line x1="8" y1="2" x2="8" y2="6" />
                                <line x1="3" y1="10" x2="21" y2="10" />
                              </svg>
                              {dueLabel}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M4 12a8 8 0 0 1 16 0" />
                                <polyline points="12 8 12 12 14 14" />
                              </svg>
                              Every {task.frequencyValue} {task.frequencyUnit}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* ---- Seasonal Tip ---- */}
      <Card className="border-[var(--color-info-200)] bg-[var(--color-info-50)] dark:border-sky-800 dark:bg-sky-950">
        <CardHeader className="pb-1">
          <div className="flex items-center gap-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--color-info-600)]"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <CardTitle className="text-base text-[var(--color-info-700)] dark:text-sky-200">
              {seasonalTip.title}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-info-700)] dark:text-sky-300 leading-relaxed">
            {seasonalTip.body}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
