import { describe, it, expect } from "vitest";
import { undoTaskSchema } from "./schemas";

const valid = {
  completionId: "6f1e0a4e-3f2b-4c1d-9e8f-1a2b3c4d5e6f",
  previousNextDueDate: "2026-01-31",
  previousLastCompletedDate: null,
  previousIsActive: true,
};

describe("undoTaskSchema", () => {
  it("accepts a valid undo token", () => {
    expect(undoTaskSchema.parse(valid)).toEqual(valid);
  });

  it("accepts a previous last-completed date", () => {
    const result = undoTaskSchema.parse({
      ...valid,
      previousLastCompletedDate: "2025-12-01",
    });
    expect(result.previousLastCompletedDate).toBe("2025-12-01");
  });

  it("rejects a non-uuid completion id", () => {
    expect(() =>
      undoTaskSchema.parse({ ...valid, completionId: "nope" })
    ).toThrow();
  });

  it("rejects malformed dates", () => {
    expect(() =>
      undoTaskSchema.parse({ ...valid, previousNextDueDate: "01/31/2026" })
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() =>
      undoTaskSchema.parse({ completionId: valid.completionId })
    ).toThrow();
  });
});
