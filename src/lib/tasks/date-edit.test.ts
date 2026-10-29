import { describe, it, expect } from "vitest";
import { resolveDateEdit, planRevertLast, clientToday } from "./date-edit";

// Agreed 2026-10-29 (tester feedback round 2): Next Due and Last Completed
// are editable, and an accidental Complete/Skip can be reverted later.

const monthly = { frequencyValue: 3, frequencyUnit: "months" as const };
const TODAY = "2026-10-29";

describe("resolveDateEdit", () => {
  it("sets next due directly when given", () => {
    expect(resolveDateEdit({ nextDueDate: "2026-12-01" }, monthly, TODAY)).toEqual({
      ok: true,
      updates: { nextDueDate: "2026-12-01" },
    });
  });

  it("changing last done alone reschedules next due from it", () => {
    expect(resolveDateEdit({ lastCompletedDate: "2026-08-15" }, monthly, TODAY)).toEqual({
      ok: true,
      updates: { lastCompletedDate: "2026-08-15", nextDueDate: "2026-11-15" },
    });
  });

  it("an explicit next due wins over the one implied by last done", () => {
    expect(
      resolveDateEdit({ lastCompletedDate: "2026-08-15", nextDueDate: "2027-01-10" }, monthly, TODAY)
    ).toEqual({
      ok: true,
      updates: { lastCompletedDate: "2026-08-15", nextDueDate: "2027-01-10" },
    });
  });

  it("can clear last done without moving next due", () => {
    expect(resolveDateEdit({ lastCompletedDate: null }, monthly, TODAY)).toEqual({
      ok: true,
      updates: { lastCompletedDate: null },
    });
  });

  it("rejects a last-done date in the future", () => {
    const r = resolveDateEdit({ lastCompletedDate: "2026-11-05" }, monthly, TODAY);
    expect(r.ok).toBe(false);
  });

  it("rejects impossible dates", () => {
    expect(resolveDateEdit({ nextDueDate: "2026-02-30" }, monthly, TODAY).ok).toBe(false);
  });

  it("allows last done = today", () => {
    expect(resolveDateEdit({ lastCompletedDate: TODAY }, monthly, TODAY).ok).toBe(true);
  });
});

describe("planRevertLast", () => {
  const c = (id: string, completedAt: string, createdAt: string, skipped = false) => ({
    id,
    completedAt: new Date(completedAt),
    createdAt: new Date(createdAt),
    skipped,
  });

  it("returns null when there is nothing to revert", () => {
    expect(planRevertLast([], monthly, TODAY)).toBeNull();
  });

  it("reverting the only completion leaves the task never-done and due today", () => {
    expect(
      planRevertLast([c("a", "2026-10-29T12:00:00Z", "2026-10-29T12:00:00Z")], monthly, TODAY)
    ).toEqual({ deleteId: "a", lastCompletedDate: null, nextDueDate: TODAY });
  });

  it("falls back to the previous real completion and reschedules from it", () => {
    const plan = planRevertLast(
      [
        c("old", "2026-06-10T12:00:00Z", "2026-06-10T12:00:00Z"),
        c("new", "2026-10-29T12:00:00Z", "2026-10-29T12:00:00Z"),
      ],
      monthly,
      TODAY
    );
    expect(plan).toEqual({ deleteId: "new", lastCompletedDate: "2026-06-10", nextDueDate: "2026-09-10" });
  });

  it("reverts the most recently recorded action, even if it was backdated", () => {
    // Logged today, but backdated to August — it's still the action to undo.
    const plan = planRevertLast(
      [
        c("sept", "2026-09-20T12:00:00Z", "2026-09-20T12:00:00Z"),
        c("backdated", "2026-08-01T12:00:00Z", "2026-10-29T12:00:00Z"),
      ],
      monthly,
      TODAY
    );
    expect(plan?.deleteId).toBe("backdated");
    expect(plan?.lastCompletedDate).toBe("2026-09-20");
  });

  it("skips don't count as the last time it was done", () => {
    const plan = planRevertLast(
      [
        c("skip", "2026-09-01T12:00:00Z", "2026-09-01T12:00:00Z", true),
        c("done", "2026-10-29T12:00:00Z", "2026-10-29T12:00:00Z"),
      ],
      monthly,
      TODAY
    );
    expect(plan).toEqual({ deleteId: "done", lastCompletedDate: null, nextDueDate: TODAY });
  });

  it("reverting a skip puts the task back due from its last real completion", () => {
    const plan = planRevertLast(
      [
        c("done", "2026-07-01T12:00:00Z", "2026-07-01T12:00:00Z"),
        c("skip", "2026-10-28T12:00:00Z", "2026-10-28T12:00:00Z", true),
      ],
      monthly,
      TODAY
    );
    expect(plan).toEqual({ deleteId: "skip", lastCompletedDate: "2026-07-01", nextDueDate: "2026-10-01" });
  });
});

describe("clientToday", () => {
  const now = new Date("2026-10-29T15:00:00Z");
  it("trusts the client's day when it's within a day of the server's", () => {
    expect(clientToday("2026-10-28", now)).toBe("2026-10-28");
    expect(clientToday("2026-10-30", now)).toBe("2026-10-30");
  });
  it("falls back to the server's UTC day when missing or far off", () => {
    expect(clientToday(undefined, now)).toBe("2026-10-29");
    expect(clientToday("2027-01-01", now)).toBe("2026-10-29");
  });
});
