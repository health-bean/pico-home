"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

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
  const month = new Date().getMonth(); // 0-indexed
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

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type Priority = "safety" | "prevent_damage" | "efficiency" | "cosmetic";
type Category = "HVAC" | "Plumbing" | "Electrical" | "Exterior" | "Interior" | "Appliances" | "Landscaping";

interface Task {
  id: string;
  name: string;
  category: Category;
  dueLabel: string;
  priority: Priority;
  estimatedMinutes: number;
  completed: boolean;
}

const PRIORITY_CONFIG: Record<Priority, { label: string; variant: "danger" | "warning" | "info" | "default" }> = {
  safety: { label: "Critical", variant: "danger" },
  prevent_damage: { label: "Preventive", variant: "warning" },
  efficiency: { label: "Efficiency", variant: "info" },
  cosmetic: { label: "Cosmetic", variant: "default" },
};

const CATEGORY_VARIANT: Record<Category, "default" | "success" | "warning" | "danger" | "info"> = {
  HVAC: "info",
  Plumbing: "default",
  Electrical: "warning",
  Exterior: "success",
  Interior: "default",
  Appliances: "info",
  Landscaping: "success",
};

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    name: "Replace HVAC air filter",
    category: "HVAC",
    dueLabel: "Today",
    priority: "efficiency",
    estimatedMinutes: 10,
    completed: false,
  },
  {
    id: "2",
    name: "Test smoke detectors",
    category: "Electrical",
    dueLabel: "Today",
    priority: "safety",
    estimatedMinutes: 15,
    completed: false,
  },
  {
    id: "3",
    name: "Clean gutters",
    category: "Exterior",
    dueLabel: "Tomorrow",
    priority: "prevent_damage",
    estimatedMinutes: 45,
    completed: false,
  },
  {
    id: "4",
    name: "Inspect washing machine hoses",
    category: "Appliances",
    dueLabel: "In 3 days",
    priority: "prevent_damage",
    estimatedMinutes: 10,
    completed: false,
  },
  {
    id: "5",
    name: "Touch up exterior paint",
    category: "Exterior",
    dueLabel: "In 5 days",
    priority: "cosmetic",
    estimatedMinutes: 60,
    completed: false,
  },
];

const OVERDUE_COUNT = 3;

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
// Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const greeting = useMemo(() => getGreeting(), []);
  const seasonalTip = useMemo(() => getSeasonalTip(), []);

  const overallScore = 78;
  const subScores = [
    { label: "Critical Tasks", score: 92 },
    { label: "Preventive Care", score: 71 },
    { label: "Home Efficiency", score: 68 },
  ];

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-6 pb-24">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{greeting}, Alex</h1>
        <p className="text-sm text-muted-foreground">Here is your home at a glance.</p>
      </div>

      {/* ---- Home Upkeep Score ---- */}
      <Card>
        <CardHeader className="items-center pb-2">
          <CardTitle>Home Upkeep Score</CardTitle>
          <CardDescription>How well you&apos;re keeping up with tasks</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6">
          <CircularScore score={overallScore} />
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

      {/* ---- Overdue Tasks Alert ---- */}
      {OVERDUE_COUNT > 0 && (
        <Card className="border-[var(--color-danger-200)] bg-[var(--color-danger-50)] dark:border-red-800 dark:bg-red-950">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger text-white text-sm font-bold">
                {OVERDUE_COUNT}
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
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className={task.completed ? "opacity-60" : undefined}
            >
              <CardContent className="flex items-start gap-3 p-4">
                {/* Completion button */}
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    task.completed
                      ? "border-success bg-success text-white"
                      : "border-border bg-transparent hover:border-primary"
                  }`}
                >
                  {task.completed && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* Task details */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium text-foreground ${task.completed ? "line-through" : ""}`}>
                    {task.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge variant={CATEGORY_VARIANT[task.category]} size="sm">
                      {task.category}
                    </Badge>
                    <Badge variant={PRIORITY_CONFIG[task.priority].variant} size="sm">
                      {PRIORITY_CONFIG[task.priority].label}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      {task.dueLabel}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {task.estimatedMinutes} min
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ---- Seasonal Tip ---- */}
      <Card className="border-[var(--color-info-200)] bg-[var(--color-info-50)] dark:border-sky-800 dark:bg-sky-950">
        <CardHeader className="pb-1">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-info-600)]">
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
