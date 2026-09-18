import { describe, it, expect } from "vitest";
import { restoreTaskSchema } from "./schemas";

describe("restoreTaskSchema", () => {
  it("defaults to rescheduling (Restore from the Dismissed list, maybe months later)", () => {
    expect(restoreTaskSchema.parse({})).toEqual({ keepDueDate: false });
  });

  it("lets Undo put the task back exactly as it was", () => {
    expect(restoreTaskSchema.parse({ keepDueDate: true })).toEqual({ keepDueDate: true });
  });

  it("rejects non-boolean values", () => {
    expect(restoreTaskSchema.safeParse({ keepDueDate: "yes" }).success).toBe(false);
  });
});
