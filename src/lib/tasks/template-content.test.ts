import { describe, it, expect } from "vitest";
import { TASK_TEMPLATES } from "./templates";

/** Content invariants for the task template library.
 *  These guard against factual/safety errors and structural drift. */
describe("template content safety", () => {
  it("never claims carbon monoxide is heavier than air (it is slightly lighter and mixes evenly)", () => {
    for (const t of TASK_TEMPLATES) {
      const text = `${t.description} ${t.tips ?? ""} ${t.whyItMatters ?? ""}`;
      expect(text.toLowerCase()).not.toContain("heavier than air");
    }
  });

  it("electrical panel task warns against removing the inner (dead-front) cover", () => {
    const panel = TASK_TEMPLATES.find((t) => t.id === "electrical-inspect-panel");
    expect(panel).toBeDefined();
    const text = `${panel!.description} ${panel!.tips ?? ""}`.toLowerCase();
    // Must direct users to the hinged door only, never the screwed-on cover
    expect(text).toContain("door");
    expect(text).toMatch(/never remove|don't remove|do not remove/);
  });

  it("has a dedicated CO detector replacement task (CO sensors expire)", () => {
    const ids = TASK_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("safety-replace-co-detectors");
  });
});

describe("template structural invariants", () => {
  it("has globally unique template ids", () => {
    const ids = TASK_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has globally unique template names (names are the de-facto dedup key)", () => {
    const names = TASK_TEMPLATES.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
