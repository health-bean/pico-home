import { describe, it, expect } from "vitest";
import { tasksToRetire, withoutOne } from "./retire";

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
