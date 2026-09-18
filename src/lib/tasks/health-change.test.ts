import { describe, it, expect } from "vitest";
import { TASK_TEMPLATES } from "./templates";
import { retimeForHealthChange, healthTasksToAdd } from "./scheduling";

const drain = TASK_TEMPLATES.find((t) => t.id === "plumbing-drain-treatment")!;

describe("retimeForHealthChange — changing household options", () => {
  it("re-times a task still at the frequency the old options produced", () => {
    // 3 months is the default with no options → mold sensitivity makes it monthly
    expect(
      retimeForHealthChange(drain, { frequencyValue: 3, frequencyUnit: "months" }, {}, { moldSensitive: true })
    ).toEqual({ frequencyValue: 1, frequencyUnit: "months" });
  });

  it("never overwrites a frequency the user edited themselves", () => {
    expect(
      retimeForHealthChange(drain, { frequencyValue: 2, frequencyUnit: "weeks" }, {}, { moldSensitive: true })
    ).toBeNull();
  });

  it("returns null when the options don't affect this task", () => {
    expect(
      retimeForHealthChange(drain, { frequencyValue: 3, frequencyUnit: "months" }, {}, { hasPets: true })
    ).toBeNull();
  });

  it("turning an option off restores the default", () => {
    expect(
      retimeForHealthChange(drain, { frequencyValue: 1, frequencyUnit: "months" }, { moldSensitive: true }, {})
    ).toEqual({ frequencyValue: 3, frequencyUnit: "months" });
  });
});

describe("healthTasksToAdd — ticking an option in Settings adds its tasks", () => {
  const home = { type: "single_family" as const, systems: ["plumbing" as const], appliances: [] };

  it("adds the tasks the new option switches on", () => {
    const added = healthTasksToAdd(home, new Set(), { moldSensitive: true }).map((t) => t.id);
    expect(added).toContain("health-inspect-mold");
    expect(added).toContain("health-check-humidity");
  });

  it("doesn't add ordinary tasks — only option-gated ones", () => {
    const added = healthTasksToAdd(home, new Set(), { moldSensitive: true });
    expect(added.every((t) => t.healthRequired.length > 0)).toBe(true);
  });

  it("skips tasks the home already has, including dismissed ones (never revived)", () => {
    const added = healthTasksToAdd(home, new Set(["Inspect for Mold Growth"]), { moldSensitive: true }).map((t) => t.id);
    expect(added).not.toContain("health-inspect-mold");
  });
});
