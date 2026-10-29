import { describe, it, expect } from "vitest";
import { dashboardUrgency, selectDashboardTasks } from "./dashboard-list";

const TODAY = "2026-10-12";

const t = (
  name: string,
  nextDueDate: string,
  priority = "prevent_damage",
  frequencyValue = 1,
  frequencyUnit = "months"
) => ({ id: name, name, nextDueDate, priority, frequencyValue, frequencyUnit });

describe("dashboardUrgency", () => {
  it("labels tomorrow as Tomorrow, not Today", () => {
    expect(dashboardUrgency(t("x", "2026-10-13"), TODAY).label).toBe("Tomorrow");
    expect(dashboardUrgency(t("x", "2026-10-12"), TODAY).label).toBe("Today");
  });

  it("labels the rest of the week as Soon", () => {
    const u = dashboardUrgency(t("x", "2026-10-18"), TODAY);
    expect(u.label).toBe("Soon");
    expect(u.level).toBe("upcoming");
  });

  it("colours lateness relative to the task's cycle", () => {
    // 3 days late on a weekly task = 43% of a cycle → slipping
    expect(dashboardUrgency(t("w", "2026-10-09", "cosmetic", 1, "weeks"), TODAY).level).toBe("slipping");
    // 4 days late on a weekly task = 57% → late
    expect(dashboardUrgency(t("w", "2026-10-08", "cosmetic", 1, "weeks"), TODAY).level).toBe("late");
    // 30 days late on a yearly task = 8% → only slipping
    expect(dashboardUrgency(t("y", "2026-09-12", "cosmetic", 1, "years"), TODAY).level).toBe("slipping");
  });

  it("calls every past-due task Overdue regardless of severity", () => {
    expect(dashboardUrgency(t("y", "2026-10-11", "cosmetic", 1, "years"), TODAY).label).toBe("Overdue");
  });
});

describe("selectDashboardTasks", () => {
  it("shows at most 5 and counts the rest", () => {
    const tasks = Array.from({ length: 8 }, (_, i) => t(`t${i}`, `2026-10-1${(i % 7) + 2}`));
    const { shown, moreCount } = selectDashboardTasks(tasks, TODAY);
    expect(shown).toHaveLength(5);
    expect(moreCount).toBe(3);
  });

  it("puts safety first within overdue; upcoming goes by date, safety first only on the same day", () => {
    // Critique 2026-10-29: a safety task due in 3 days was listed above a
    // chore due today. Soonest first; safety breaks ties within a day.
    const { shown } = selectDashboardTasks(
      [
        t("upcoming chore", "2026-10-13"),
        t("upcoming safety", "2026-10-15", "safety"),
        t("same-day chore", "2026-10-15"),
        t("today chore", "2026-10-12"),
        t("overdue chore", "2026-10-01"),
        t("overdue safety", "2026-10-10", "safety"),
      ],
      TODAY,
      10
    );
    expect(shown.map((x) => x.name)).toEqual([
      "overdue safety",
      "overdue chore",
      "today chore",
      "upcoming chore",
      "upcoming safety",
      "same-day chore",
    ]);
  });

  it("orders overdue tasks by how late they are relative to their cycle", () => {
    const { shown } = selectDashboardTasks(
      [
        t("yearly, 30d late", "2026-09-12", "cosmetic", 1, "years"),
        t("weekly, 4d late", "2026-10-08", "cosmetic", 1, "weeks"),
      ],
      TODAY
    );
    expect(shown[0].name).toBe("weekly, 4d late");
  });
});
