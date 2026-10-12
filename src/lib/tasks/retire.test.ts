import { describe, it, expect } from "vitest";
import { revivedDueDate, tasksToRetire, withoutOne } from "./retire";

const base = {
  type: "single_family" as const,
  systems: ["plumbing", "electrical"] as const,
  appliances: ["dishwasher", "hot_tub"] as const,
  systemSubtypes: {},
  climateZone: "4A",
};
const home = { ...base, systems: [...base.systems], appliances: [...base.appliances] };

const task = (name: string, extra: Partial<{ isCustom: boolean; isActive: boolean }> = {}) => ({
  id: name,
  name,
  isCustom: false,
  isActive: true,
  ...extra,
});

describe("withoutOne", () => {
  it("removes a single occurrence, keeping duplicates", () => {
    expect(withoutOne(["dishwasher", "dishwasher", "dryer"], "dishwasher")).toEqual([
      "dishwasher",
      "dryer",
    ]);
  });
});

describe("tasksToRetire", () => {
  it("retires the tasks that only applied because of the removed appliance", () => {
    const after = { ...home, appliances: withoutOne(home.appliances, "hot_tub") };
    const ids = tasksToRetire(home, after, {}, [
      task("Clean Hot Tub Filter"),
      task("Clean Dishwasher Filter"),
    ]);
    expect(ids).toEqual(["Clean Hot Tub Filter"]);
  });

  it("keeps tasks when another appliance of the same kind remains", () => {
    const two = { ...home, appliances: [...home.appliances, "hot_tub" as const] };
    const after = { ...two, appliances: withoutOne(two.appliances, "hot_tub") };
    expect(tasksToRetire(two, after, {}, [task("Clean Hot Tub Filter")])).toEqual([]);
  });

  it("never touches custom or already-inactive tasks", () => {
    const after = { ...home, appliances: withoutOne(home.appliances, "hot_tub") };
    const ids = tasksToRetire(home, after, {}, [
      task("Clean Hot Tub Filter", { isCustom: true }),
      task("Clean Hot Tub Jets", { isActive: false }),
    ]);
    expect(ids).toEqual([]);
  });
});

describe("revivedDueDate", () => {
  const now = new Date(2026, 9, 12); // Oct 12
  const tpl = { id: "hot-tub-filter", seasonalMonths: [] as number[] };

  it("keeps a due date that is still ahead", () => {
    expect(revivedDueDate("2026-11-30", tpl, 1, "months", now)).toBe("2026-11-30");
  });

  it("reschedules a stale date like a newly added task — after the quiet start", () => {
    const due = revivedDueDate("2026-03-01", tpl, 1, "months", now);
    const days = Math.round((Date.parse(due) - Date.parse("2026-10-12")) / 86_400_000);
    expect(days).toBeGreaterThanOrEqual(14);
    expect(days).toBeLessThan(30);
  });

  it("treats today as stale-free (still due today is kept)", () => {
    expect(revivedDueDate("2026-10-12", tpl, 1, "months", now)).toBe("2026-10-12");
  });
});
