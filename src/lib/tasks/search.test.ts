import { describe, it, expect } from "vitest";
import { searchTasks } from "./search";

const t = (name: string, description = "", extra = "") => ({ name, description, extra });
const run = (items: ReturnType<typeof t>[], q: string) =>
  searchTasks(items, q, (x) => x.extra).map((x) => x.name);

describe("searchTasks", () => {
  const items = [
    t("Check Gutters (Clean If Needed)", "During a heavy rain, watch your gutters", "Exterior & Structure Roof & Gutters"),
    t("Clean Dryer Vent Duct", "Disconnect the dryer and clean the vent", "Appliances Dryer"),
    t("Clean Washing Machine", "Run a hot cleaning cycle; pull back the door gasket", "Appliances Washing Machine"),
    t("Test Smoke Detectors", "Press the test button", "Safety"),
  ];

  it("empty or blank query returns nothing (search is off)", () => {
    expect(run(items, "")).toEqual([]);
    expect(run(items, "   ")).toEqual([]);
  });

  it("matches case-insensitively on name", () => {
    expect(run(items, "GUTTER")).toEqual(["Check Gutters (Clean If Needed)"]);
  });

  it("every word must match somewhere, in any order", () => {
    expect(run(items, "vent dryer")).toEqual(["Clean Dryer Vent Duct"]);
    expect(run(items, "dryer smoke")).toEqual([]);
  });

  it("matches category / appliance labels and description", () => {
    expect(run(items, "safety")).toEqual(["Test Smoke Detectors"]);
    expect(run(items, "gasket")).toEqual(["Clean Washing Machine"]);
  });

  it("ranks name matches above description-only matches", () => {
    // "clean" is in three names and the gutter task's name too; "cleaning" only in a description
    const r = run(items, "clean");
    expect(r.slice(0, 3).sort()).toEqual(
      ["Check Gutters (Clean If Needed)", "Clean Dryer Vent Duct", "Clean Washing Machine"].sort()
    );
  });

  it("names that start with the query come first", () => {
    const r = run([t("Inspect Washing Machine Hoses"), t("Washer Filter")], "wash");
    expect(r[0]).toBe("Washer Filter");
  });

  it("ignores punctuation like A/C and ampersands", () => {
    expect(run([t("Clean A/C Condensate Line")], "ac condensate")).toEqual(["Clean A/C Condensate Line"]);
    expect(run(items, "roof gutters")).toEqual(["Check Gutters (Clean If Needed)"]);
  });
});
