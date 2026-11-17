import { describe, it, expect } from "vitest";
import { TASK_TEMPLATES } from "./templates";
import { cadenceInfo } from "./cadence";

// Critique 2026-11-16: a mold-sensitive home couldn't tell why (or whether)
// a task's schedule reflected its household needs.
const tpl = (id: string) => TASK_TEMPLATES.find((t) => t.id === id)!;

describe("cadenceInfo", () => {
  it("names the household need that made a task more frequent", () => {
    const drain = tpl("plumbing-drain-treatment"); // 3 months, monthly if mold-sensitive
    expect(cadenceInfo(drain, { moldSensitive: true })).toEqual({
      suggested: { frequencyValue: 1, frequencyUnit: "months" },
      reason: "More often because of mold sensitivity",
    });
  });

  it("names the need a health-only task was added for", () => {
    const humidity = tpl("health-check-humidity");
    const info = cadenceInfo(humidity, { moldSensitive: true });
    expect(info.suggested).toEqual({ frequencyValue: 1, frequencyUnit: "months" });
    expect(info.reason).toBe("Added because of mold sensitivity");
  });

  it("no reason when household needs don't affect the task", () => {
    const drain = tpl("plumbing-drain-treatment");
    expect(cadenceInfo(drain, {})).toEqual({
      suggested: { frequencyValue: 3, frequencyUnit: "months" },
      reason: null,
    });
  });
});
