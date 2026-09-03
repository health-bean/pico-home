import { describe, it, expect } from "vitest";
import {
  stableHash,
  getInitialDueDate,
  selectStarterTemplates,
  STARTER_TEMPLATE_IDS,
} from "./initial-due";
import { TASK_TEMPLATES } from "./templates";

const iso = (d: Date) => d.toISOString().split("T")[0];

function tpl(id: string, seasonalMonths: number[] = []) {
  return { id, seasonalMonths };
}

describe("getInitialDueDate — seasonal anchoring", () => {
  it("anchors to the 15th of the nearest upcoming seasonal month this year", () => {
    const due = getInitialDueDate(tpl("x", [10, 11]), 1, "years", new Date(2026, 8, 10));
    expect(iso(due)).toBe(iso(new Date(2026, 9, 15)));
  });

  it("rolls to next year when the seasonal window has passed", () => {
    const due = getInitialDueDate(tpl("x", [4, 5]), 1, "years", new Date(2026, 8, 10));
    expect(iso(due)).toBe(iso(new Date(2027, 3, 15)));
  });

  it("uses the current month if its 15th is still ahead", () => {
    const due = getInitialDueDate(tpl("x", [9]), 1, "years", new Date(2026, 8, 10));
    expect(iso(due)).toBe(iso(new Date(2026, 8, 15)));
  });

  it("skips the current month if its 15th already passed", () => {
    const due = getInitialDueDate(tpl("x", [9]), 1, "years", new Date(2026, 8, 20));
    expect(iso(due)).toBe(iso(new Date(2027, 8, 15)));
  });
});

describe("getInitialDueDate — deterministic stagger", () => {
  const now = new Date(2026, 8, 10);

  function offsetDays(due: Date): number {
    return Math.round((due.getTime() - now.getTime()) / 86_400_000);
  }

  it("staggers monthly tasks across 3..30 days", () => {
    for (const id of ["a", "b", "c", "d", "e"]) {
      const off = offsetDays(getInitialDueDate(tpl(id), 1, "months", now));
      expect(off).toBeGreaterThanOrEqual(3);
      expect(off).toBeLessThan(30);
    }
  });

  it("staggers annual tasks across 3..365 days", () => {
    const off = offsetDays(getInitialDueDate(tpl("annual-task"), 1, "years", now));
    expect(off).toBeGreaterThanOrEqual(3);
    expect(off).toBeLessThan(365);
  });

  it("caps multi-year cycles at a one-year window", () => {
    const off = offsetDays(getInitialDueDate(tpl("decade-task"), 10, "years", now));
    expect(off).toBeLessThan(365);
  });

  it("staggers weekly tasks across 0..6 days", () => {
    const off = offsetDays(getInitialDueDate(tpl("weekly-task"), 1, "weeks", now));
    expect(off).toBeGreaterThanOrEqual(0);
    expect(off).toBeLessThan(7);
  });

  it("one_time tasks are due today", () => {
    expect(iso(getInitialDueDate(tpl("once"), 1, "one_time", now))).toBe(iso(now));
  });

  it("is deterministic per template id and varies across ids", () => {
    const first = getInitialDueDate(tpl("same-id"), 1, "months", now);
    const second = getInitialDueDate(tpl("same-id"), 1, "months", now);
    expect(iso(first)).toBe(iso(second));

    const offsets = new Set(
      ["a", "b", "c", "d", "e", "f"].map((id) =>
        offsetDays(getInitialDueDate(tpl(id), 1, "months", now))
      )
    );
    expect(offsets.size).toBeGreaterThan(1);
  });

  it("stableHash is non-negative and stable", () => {
    expect(stableHash("hvac-replace-filter")).toBe(stableHash("hvac-replace-filter"));
    expect(stableHash("anything")).toBeGreaterThanOrEqual(0);
  });
});

describe("selectStarterTemplates", () => {
  const typical = TASK_TEMPLATES.filter((t) =>
    [
      "safety-test-smoke-detectors",
      "safety-test-co-detectors",
      "hvac-replace-filter",
      "safety-clean-dryer-vent",
      "electrical-test-gfci",
      "health-verify-water-heater-temp",
      "plumbing-check-toilets",
      "garage-test-auto-reverse",
      "roof-clean-gutters",
      "plumbing-flush-water-heater",
    ].includes(t.id)
  );

  it("returns starters in priority order, capped at 6", () => {
    const picked = selectStarterTemplates(typical);
    expect(picked.length).toBe(6);
    expect(picked.map((t) => t.id)).toEqual(STARTER_TEMPLATE_IDS.slice(0, 6));
  });

  it("only returns templates that are actually applicable", () => {
    const two = TASK_TEMPLATES.filter((t) =>
      ["safety-test-smoke-detectors", "electrical-test-gfci"].includes(t.id)
    );
    const picked = selectStarterTemplates(two);
    expect(picked.map((t) => t.id)).toEqual([
      "safety-test-smoke-detectors",
      "electrical-test-gfci",
    ]);
  });

  it("respects a custom max", () => {
    expect(selectStarterTemplates(typical, 3).length).toBe(3);
  });
});
