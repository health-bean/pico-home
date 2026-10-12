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

const DAY = 86_400_000;
const daysFrom = (now: Date, due: Date) => Math.round((due.getTime() - now.getTime()) / DAY);
const IDS = Array.from({ length: 40 }, (_, i) => `template-${i}`);

describe("getInitialDueDate — seasonal spread", () => {
  it("lands inside the nearest upcoming seasonal month", () => {
    const now = new Date(2026, 7, 1); // Aug 1
    for (const id of IDS) {
      const due = getInitialDueDate(tpl(id, [10, 11]), 1, "years", now);
      expect(due.getMonth()).toBe(9); // October
    }
  });

  it("spreads tasks across the month instead of stacking them on one day", () => {
    const now = new Date(2026, 7, 1);
    const days = new Set(
      IDS.map((id) => getInitialDueDate(tpl(id, [10]), 1, "years", now).getDate())
    );
    expect(days.size).toBeGreaterThan(15);
  });

  it("rolls to next year when the seasonal window has passed", () => {
    const due = getInitialDueDate(tpl("x", [4, 5]), 1, "years", new Date(2026, 8, 10));
    expect(due.getFullYear()).toBe(2027);
    expect([3, 4]).toContain(due.getMonth());
  });

  it("never lands in the first two weeks — in-season tasks spill to days 14–27", () => {
    const now = new Date(2026, 9, 12); // Oct 12, signing up mid-season
    const offsets = IDS.map((id) =>
      daysFrom(now, getInitialDueDate(tpl(id, [10, 11]), 1, "years", now))
    );
    for (const off of offsets) expect(off).toBeGreaterThanOrEqual(14);
    // ...and none of them got pushed a whole year out
    for (const off of offsets) expect(off).toBeLessThan(60);
  });
});

describe("getInitialDueDate — quiet first two weeks + deterministic stagger", () => {
  const now = new Date(2026, 8, 10);
  const offsetDays = (due: Date) => daysFrom(now, due);

  it("staggers monthly tasks across days 14..29", () => {
    for (const id of IDS) {
      const off = offsetDays(getInitialDueDate(tpl(id), 1, "months", now));
      expect(off).toBeGreaterThanOrEqual(14);
      expect(off).toBeLessThan(30);
    }
  });

  it("staggers annual tasks across 14..365 days", () => {
    const off = offsetDays(getInitialDueDate(tpl("annual-task"), 1, "years", now));
    expect(off).toBeGreaterThanOrEqual(14);
    expect(off).toBeLessThan(365);
  });

  it("caps multi-year cycles at a one-year window", () => {
    const off = offsetDays(getInitialDueDate(tpl("decade-task"), 10, "years", now));
    expect(off).toBeLessThan(365);
  });

  it("starts weekly and fortnightly tasks after the quiet period, within one cycle", () => {
    for (const id of IDS) {
      const w = offsetDays(getInitialDueDate(tpl(id), 1, "weeks", now));
      expect(w).toBeGreaterThanOrEqual(14);
      expect(w).toBeLessThan(21);
      const f = offsetDays(getInitialDueDate(tpl(id), 2, "weeks", now));
      expect(f).toBeGreaterThanOrEqual(14);
      expect(f).toBeLessThan(28);
    }
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
