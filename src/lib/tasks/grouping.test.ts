import { describe, it, expect } from "vitest";
import { groupBySubgroup } from "./grouping";

const t = (name: string, subgroup: string | null, nextDueDate: string) => ({
  name,
  subgroup,
  nextDueDate,
});

describe("groupBySubgroup", () => {
  it("keeps every task for one appliance together instead of interleaving by date", () => {
    const groups = groupBySubgroup([
      t("Replace fridge filter", "refrigerator", "2026-09-20"),
      t("Clean dishwasher filter", "dishwasher", "2026-10-01"),
      t("Check fridge door seals", "refrigerator", "2027-03-01"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["refrigerator", "dishwasher"]);
    expect(groups[0].tasks.map((x) => x.name)).toEqual([
      "Replace fridge filter",
      "Check fridge door seals",
    ]);
  });

  it("orders groups by their soonest task, and tasks by date within a group", () => {
    const groups = groupBySubgroup([
      t("Dryer late", "dryer", "2026-12-01"),
      t("Washer soon", "washing_machine", "2026-09-19"),
      t("Dryer overdue", "dryer", "2026-09-01"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["dryer", "washing_machine"]);
    expect(groups[0].tasks.map((x) => x.name)).toEqual(["Dryer overdue", "Dryer late"]);
  });

  it("breaks ties by key so the order is stable across renders", () => {
    const groups = groupBySubgroup([
      t("B", "oven_range", "2026-10-01"),
      t("A", "dishwasher", "2026-10-01"),
    ]);
    expect(groups.map((g) => g.key)).toEqual(["dishwasher", "oven_range"]);
  });

  it("puts tasks without a subgroup (custom tasks) in an 'other' group", () => {
    const groups = groupBySubgroup([t("My custom task", null, "2026-10-01")]);
    expect(groups).toEqual([{ key: "other", tasks: [t("My custom task", null, "2026-10-01")] }]);
  });
});
