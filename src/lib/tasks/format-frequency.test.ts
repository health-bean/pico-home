import { describe, it, expect } from "vitest";
import { formatFrequency } from "@/app/(app)/tasks/task-constants";

describe("formatFrequency", () => {
  it("uses natural words for singular cycles", () => {
    expect(formatFrequency(1, "weeks")).toBe("Weekly");
    expect(formatFrequency(1, "months")).toBe("Monthly");
    expect(formatFrequency(1, "years")).toBe("Yearly");
    expect(formatFrequency(1, "days")).toBe("Daily");
  });

  it("pluralizes multi-unit cycles correctly", () => {
    expect(formatFrequency(2, "weeks")).toBe("Every 2 weeks");
    expect(formatFrequency(3, "months")).toBe("Every 3 months");
    expect(formatFrequency(2, "years")).toBe("Every 2 years");
    expect(formatFrequency(10, "days")).toBe("Every 10 days");
  });

  it("handles one-time tasks", () => {
    expect(formatFrequency(1, "one_time")).toBe("One-time");
  });

  it("falls back sanely on unknown units", () => {
    expect(formatFrequency(4, "fortnights")).toBe("Every 4 fortnights");
  });
});
