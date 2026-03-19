import { describe, it, expect } from "vitest";
import {
  getNextDueDate,
  getApplicableTemplates,
  getSeasonalTasks,
  calculateHomeHealthScore,
  adjustFrequencyForHealth,
  shouldIncludeHealthTemplate,
} from "./scheduling";
import type { TaskTemplate } from "./templates";

// ─── getNextDueDate ──────────────────────────────────────────────────────────

describe("getNextDueDate", () => {
  const base = new Date("2026-01-15T12:00:00Z");

  it("adds days correctly", () => {
    const result = getNextDueDate(3, "days", base);
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-18");
  });

  it("adds weeks correctly", () => {
    const result = getNextDueDate(2, "weeks", base);
    expect(result.toISOString().slice(0, 10)).toBe("2026-01-29");
  });

  it("adds months correctly", () => {
    const result = getNextDueDate(1, "months", base);
    expect(result.toISOString().slice(0, 10)).toBe("2026-02-15");
  });

  it("handles month-end overflow (Jan 31 + 1 month)", () => {
    const jan31 = new Date("2026-01-31T12:00:00Z");
    const result = getNextDueDate(1, "months", jan31);
    // JS Date wraps to March 3 for non-leap year
    expect(result.getMonth()).toBeGreaterThanOrEqual(1); // at least February
  });

  it("adds years correctly", () => {
    const result = getNextDueDate(1, "years", base);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(0); // January
  });

  it("one_time with lastCompleted returns far future", () => {
    const result = getNextDueDate(1, "one_time", base);
    expect(result.getFullYear()).toBe(2126); // 100 years ahead
  });

  it("one_time without lastCompleted returns today", () => {
    const now = new Date();
    const result = getNextDueDate(1, "one_time");
    expect(result.toISOString().slice(0, 10)).toBe(
      now.toISOString().slice(0, 10)
    );
  });

  it("defaults to now when no lastCompleted provided", () => {
    const before = new Date();
    const result = getNextDueDate(5, "days");
    const after = new Date();
    after.setDate(after.getDate() + 5);
    // Result should be approximately 5 days from now
    expect(result.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });
});

// ─── getApplicableTemplates ──────────────────────────────────────────────────

describe("getApplicableTemplates", () => {
  it("returns templates matching home type", () => {
    const result = getApplicableTemplates({
      type: "single_family",
      systems: ["hvac"],
      appliances: ["refrigerator"],
    });
    // Should return at least some templates (HVAC system present)
    expect(result.length).toBeGreaterThan(0);
  });

  it("filters out templates requiring systems the home lacks", () => {
    const result = getApplicableTemplates({
      type: "condo",
      systems: [], // no systems
      appliances: [],
    });
    // Templates requiring specific systems should be filtered out
    const requiresSystems = result.filter(
      (t) => t.applicableSystems.length > 0
    );
    expect(requiresSystems.length).toBe(0);
  });

  it("filters out templates requiring appliances the home lacks", () => {
    const result = getApplicableTemplates({
      type: "single_family",
      systems: [],
      appliances: [], // no appliances
    });
    const requiresAppliances = result.filter(
      (t) => t.applicableApplianceCategories.length > 0
    );
    expect(requiresAppliances.length).toBe(0);
  });
});

// ─── getSeasonalTasks ────────────────────────────────────────────────────────

describe("getSeasonalTasks", () => {
  const base = {
    description: "Test task",
    estimatedMinutes: null,
    estimatedCostLow: null,
    estimatedCostHigh: null,
    diyDifficulty: "easy" as const,
    healthCategories: [],
    tips: null,
    whyItMatters: null,
    healthMultipliers: {},
    healthRequired: [],
  };

  const mockTemplates: TaskTemplate[] = [
    {
      ...base,
      id: "year-round",
      name: "Year Round Task",
      category: "cleaning",
      priority: "cosmetic",
      frequencyUnit: "months",
      frequencyValue: 1,
      seasonalMonths: [],
      applicableHomeTypes: [],
      applicableSystems: [],
      applicableApplianceCategories: [],
    },
    {
      ...base,
      id: "spring-only",
      name: "Spring Task",
      category: "lawn_landscape",
      priority: "cosmetic",
      frequencyUnit: "years",
      frequencyValue: 1,
      seasonalMonths: [3, 4, 5],
      applicableHomeTypes: [],
      applicableSystems: [],
      applicableApplianceCategories: [],
    },
    {
      ...base,
      id: "winter-only",
      name: "Winter Task",
      category: "hvac",
      priority: "prevent_damage",
      frequencyUnit: "years",
      frequencyValue: 1,
      seasonalMonths: [11, 12, 1],
      applicableHomeTypes: [],
      applicableSystems: [],
      applicableApplianceCategories: [],
    },
  ];

  it("always includes year-round tasks", () => {
    const result = getSeasonalTasks(7, mockTemplates); // July
    expect(result.find((t) => t.id === "year-round")).toBeDefined();
  });

  it("includes seasonal tasks for matching month", () => {
    const result = getSeasonalTasks(3, mockTemplates); // March
    expect(result.find((t) => t.id === "spring-only")).toBeDefined();
  });

  it("excludes seasonal tasks for non-matching month", () => {
    const result = getSeasonalTasks(7, mockTemplates); // July
    expect(result.find((t) => t.id === "spring-only")).toBeUndefined();
    expect(result.find((t) => t.id === "winter-only")).toBeUndefined();
  });
});

// ─── calculateHomeHealthScore ────────────────────────────────────────────────

describe("calculateHomeHealthScore", () => {
  const future = new Date("2099-01-01");
  const past = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  it("returns all 100s for empty task list", () => {
    const result = calculateHomeHealthScore([]);
    expect(result).toEqual({
      overall: 100,
      criticalTasks: 100,
      preventiveCare: 100,
      homeEfficiency: 100,
    });
  });

  it("returns high scores when all tasks are on-time", () => {
    const result = calculateHomeHealthScore([
      { nextDueDate: future, priority: "safety", lastCompletedDate: new Date(), isActive: true },
      { nextDueDate: future, priority: "prevent_damage", lastCompletedDate: new Date(), isActive: true },
      { nextDueDate: future, priority: "efficiency", lastCompletedDate: new Date(), isActive: true },
    ]);
    expect(result.overall).toBe(100);
    expect(result.criticalTasks).toBe(100);
    expect(result.preventiveCare).toBe(100);
  });

  it("decays score for overdue tasks (2 points per day)", () => {
    const result = calculateHomeHealthScore([
      { nextDueDate: past(10), priority: "safety", lastCompletedDate: null, isActive: true },
    ]);
    // ~10 days overdue = 100 - ~20 = ~80 (±2 due to time-of-day rounding)
    expect(result.criticalTasks).toBeGreaterThanOrEqual(78);
    expect(result.criticalTasks).toBeLessThanOrEqual(82);
  });

  it("floors score at 0 for very overdue tasks", () => {
    const result = calculateHomeHealthScore([
      { nextDueDate: past(100), priority: "cosmetic", lastCompletedDate: null, isActive: true },
    ]);
    // 100 days * 2 = 200, clamped to 0 for cosmetic category
    // homeEfficiency averages efficiency (100, no tasks) and cosmetic (0)
    expect(result.homeEfficiency).toBeLessThanOrEqual(50);
  });

  it("ignores inactive tasks", () => {
    const result = calculateHomeHealthScore([
      { nextDueDate: past(50), priority: "safety", lastCompletedDate: null, isActive: false },
    ]);
    // Inactive tasks are filtered out, so empty = all 100s
    expect(result.overall).toBe(100);
  });

  it("weights safety tasks higher than cosmetic in overall score", () => {
    // One on-time safety task (weight 4) and one very overdue cosmetic (weight 1)
    const result = calculateHomeHealthScore([
      { nextDueDate: future, priority: "safety", lastCompletedDate: new Date(), isActive: true },
      { nextDueDate: past(50), priority: "cosmetic", lastCompletedDate: null, isActive: true },
    ]);
    // Safety=100*4=400, cosmetic=0*1=0 => 400/5 = 80
    expect(result.overall).toBe(80);
  });
});

// ─── adjustFrequencyForHealth ───────────────────────────────────────────────

describe("adjustFrequencyForHealth", () => {
  it("returns original frequency when no flags set", () => {
    const result = adjustFrequencyForHealth(3, { hasAllergies: 0.5 }, {});
    expect(result).toBe(3);
  });

  it("applies multiplier when flag is set", () => {
    const result = adjustFrequencyForHealth(6, { hasAllergies: 0.5 }, { hasAllergies: true });
    expect(result).toBe(3);
  });

  it("applies lowest multiplier when multiple flags match", () => {
    const result = adjustFrequencyForHealth(6, { hasAllergies: 0.5, hasPets: 0.75 }, { hasAllergies: true, hasPets: true });
    expect(result).toBe(3);
  });

  it("returns at least 1", () => {
    const result = adjustFrequencyForHealth(1, { hasAllergies: 0.25 }, { hasAllergies: true });
    expect(result).toBe(1);
  });

  it("returns original when multipliers is empty", () => {
    const result = adjustFrequencyForHealth(6, {}, { hasAllergies: true });
    expect(result).toBe(6);
  });
});

// ─── shouldIncludeHealthTemplate ────────────────────────────────────────────

describe("shouldIncludeHealthTemplate", () => {
  it("returns true when no healthRequired", () => {
    expect(shouldIncludeHealthTemplate([], {})).toBe(true);
  });

  it("returns true when required flag is set", () => {
    expect(shouldIncludeHealthTemplate(["hasAllergies"], { hasAllergies: true })).toBe(true);
  });

  it("returns false when required flag is not set", () => {
    expect(shouldIncludeHealthTemplate(["hasAllergies"], {})).toBe(false);
  });

  it("returns true when any required flag matches", () => {
    expect(shouldIncludeHealthTemplate(["hasAllergies", "hasPets"], { hasPets: true })).toBe(true);
  });
});
