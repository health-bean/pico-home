import { describe, it, expect } from "vitest";
import { buildHomeSelection, initialSelectedItems, initialHealthFlags, type FormData } from "./shared";

function form(selectedItems: FormData["selectedItems"]): FormData {
  return {
    name: "Home", type: "single_family", yearBuilt: "", sqft: "", zip: "", state: "",
    selectedItems, healthFlags: initialHealthFlags(), taskSetups: {},
  };
}

describe("buildHomeSelection appliance features", () => {
  it("reports no features for a plain refrigerator, so the water filter task is skipped", () => {
    const items = initialSelectedItems(); // refrigerator is on by default
    expect(buildHomeSelection(form(items)).applianceFeatures).toEqual([]);
  });

  it("reports the dispenser when it's ticked on the refrigerator", () => {
    const items = initialSelectedItems();
    items.refrigerator = { enabled: true, subtypes: ["fridge_dispenser"] };
    expect(buildHomeSelection(form(items)).applianceFeatures).toEqual(["fridge_dispenser"]);
  });

  it("ignores the dispenser if the refrigerator itself was unticked", () => {
    const items = initialSelectedItems();
    items.refrigerator = { enabled: false, subtypes: ["fridge_dispenser"] };
    expect(buildHomeSelection(form(items)).applianceFeatures).toEqual([]);
  });

  it("doesn't mistake other appliance chips (furnace fuel type) for features", () => {
    const items = initialSelectedItems();
    items.furnace = { enabled: true, subtypes: ["gas"] };
    expect(buildHomeSelection(form(items)).applianceFeatures).toEqual([]);
  });
});
