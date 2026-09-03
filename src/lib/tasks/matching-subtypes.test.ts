import { describe, it, expect } from "vitest";
import { getApplicableTemplates } from "./scheduling";
import type { SystemType } from "./templates";

const baseHome = {
  type: "single_family" as const,
  systems: ["water_source", "sewage", "plumbing", "electrical"] as SystemType[],
  appliances: [],
};

function ids(templates: { id: string }[]): string[] {
  return templates.map((t) => t.id);
}

describe("subtype-aware template matching", () => {
  it("does not give well-water testing to a municipal-water home", () => {
    const result = getApplicableTemplates({
      ...baseHome,
      systemSubtypes: { water_source: ["municipal"], sewage: ["sewer"] },
    });
    expect(ids(result)).not.toContain("plumbing-test-well-water");
  });

  it("does not give septic pumping to a city-sewer home", () => {
    const result = getApplicableTemplates({
      ...baseHome,
      systemSubtypes: { water_source: ["municipal"], sewage: ["sewer"] },
    });
    expect(ids(result)).not.toContain("plumbing-pump-septic");
  });

  it("gives well and septic tasks to a well + septic home", () => {
    const result = getApplicableTemplates({
      ...baseHome,
      systemSubtypes: { water_source: ["well"], sewage: ["septic"] },
    });
    expect(ids(result)).toContain("plumbing-test-well-water");
    expect(ids(result)).toContain("plumbing-pump-septic");
  });

  it("keeps well and septic tasks when the home declared no subtype (fail-open)", () => {
    const result = getApplicableTemplates(baseHome);
    expect(ids(result)).toContain("plumbing-test-well-water");
    expect(ids(result)).toContain("plumbing-pump-septic");
  });

  it("treats the 'standard' placeholder subtype as unknown (fail-open)", () => {
    const result = getApplicableTemplates({
      ...baseHome,
      systemSubtypes: { water_source: ["standard"], sewage: ["standard"] },
    });
    expect(ids(result)).toContain("plumbing-test-well-water");
    expect(ids(result)).toContain("plumbing-pump-septic");
  });

  it("includes both subtype-gated tasks when the home has both subtypes (municipal + well)", () => {
    const result = getApplicableTemplates({
      ...baseHome,
      systemSubtypes: { water_source: ["municipal", "well"] },
    });
    expect(ids(result)).toContain("plumbing-test-well-water");
  });
});

describe("solar template reachability", () => {
  it("generates solar tasks from the solar system alone (no phantom appliance required)", () => {
    const result = getApplicableTemplates({
      type: "single_family",
      systems: ["solar", "plumbing", "electrical"] as SystemType[],
      appliances: [],
    });
    expect(ids(result)).toContain("solar-panel-inspection");
    expect(ids(result)).toContain("solar-panel-cleaning");
  });
});
