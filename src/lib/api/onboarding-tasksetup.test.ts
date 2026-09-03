import { describe, it, expect } from "vitest";
import { onboardingTaskSetupSchema } from "./schemas";

describe("onboardingTaskSetupSchema", () => {
  it("accepts a 'track' setup without done dates (Quick check default)", () => {
    const parsed = onboardingTaskSetupSchema.parse({
      templateId: "safety-test-smoke-detectors",
      state: "track",
    });
    expect(parsed.state).toBe("track");
  });

  it("accepts a 'done' setup with month and year", () => {
    const parsed = onboardingTaskSetupSchema.parse({
      templateId: "safety-test-smoke-detectors",
      state: "done",
      doneMonth: 9,
      doneYear: 2026,
    });
    expect(parsed.doneYear).toBe(2026);
  });

  it("rejects a 'done' setup missing its dates", () => {
    expect(() =>
      onboardingTaskSetupSchema.parse({
        templateId: "safety-test-smoke-detectors",
        state: "done",
      })
    ).toThrow();
  });
});
