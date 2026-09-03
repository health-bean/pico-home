# Phase 1 — Make Day One Real (Core Loop) — Design Spec

Source: Pre-launch audit (2026-09-02), §3 "The time engine" and §10 Phase 1.
Problem: every generated task is seeded `today + frequency`, so day one shows
nothing, cohorts land in cliffs (day 30/90/180/365), the score debuts red at
the first cliff, and `seasonalMonths` / `taskSetups` are collected but unused.

## Decisions

**D1 — Starter tasks ("first week").** A fixed, ordered list of high-value,
low-effort template ids (`STARTER_TEMPLATE_IDS`). At onboarding, the starter
set = first 6 that are applicable to the home. Starter tasks the user didn't
mark "recently done" are due **today**.

**D2 — "Quick check" onboarding step.** New wizard step (after Household,
before Complete) listing the starter set with two choices per task:
"Done recently" → `taskSetups` state `done` (current month/year) → next due =
one cycle out; "Add it to my list" (default) → state `track` → **due today**.
Skipping the step = all starters tracked (due today). Server change: state
`track` now means due today (previously identical to the auto path).

**D3 — Initial due dates for everything else (auto path).**
`getInitialDueDate(template, adjustedFrequency, adjustedUnit)`:
- `seasonalMonths` non-empty → the 15th of the next occurrence of the nearest
  upcoming seasonal month (this year if still ahead, else next year).
- otherwise → deterministic stagger: `today + offsetDays` where
  `offsetDays = 3 + (stableHash(template.id) % (min(cycleDays, 365) - 3))`,
  so cohorts spread across one cycle window instead of landing on one day.
- `one_time` → today. Weekly (`cycleDays <= 7`) → hash across the 7 days with
  no minimum offset.
`getNextDueDate` keeps its +cycle behavior (recurrence after completion); its
stale docstring is corrected.

**D4 — Score debuts helpful, never red.** Dashboard API always returns the
score (drop the `hasTasksDue` null-gate) plus `completionsAllTime` and a
`focus` list (top 3 actionable tasks: overdue first, then due-soon, safety
priority first). UI: before the first-ever completion the score renders in
brand amber (never the red "Needs attention" state) with the message
"Every home starts somewhere — start with your starter tasks."; the ring is a
link to /tasks. Welcome-card instructions become real links.

**D5 — Undo on Complete and Skip.** Complete/skip responses include an
`undo` token `{ completionId, previousNextDueDate, previousLastCompletedDate,
previousIsActive }`. New `POST /api/tasks/[id]/undo` validates task access +
completion ownership, deletes the completion, restores the three fields, and
recalculates the score. Toast gains an action button ("Undo", 8s). Restore
values come from the client token — same trust level as the existing PATCH
edit endpoint (own-home data only); validated as parseable dates.

**D6 — Action clarity.** Task-detail actions get one-line explanations
(Complete "Logs it and schedules the next one" · Skip "Not this time — moves
to the next cycle, no credit" · Snooze "Remind me again in 7 days").
Dismissing a `safety`-priority task requires an inline confirm step. Snooze
now counts from **today** when the task is overdue (`max(today, due) + days`).

**D7 — Onboarding "Around the house" appliance group.** New group in the
Major Systems step: Dryer, Washing Machine, Dishwasher, Refrigerator,
Range / Oven, Garbage Disposal, Garage Door, Sump Pump, Water Softener.
Dryer, Washer, Dishwasher, Refrigerator, Range pre-checked (opt-out — these
generate the highest-value safety/damage tasks: dryer vent, washer hoses).
Divergence from audit: no interactive "not sure" chips per systems group this
phase; each group gets a reassurance line ("Not sure? Skip it — you can add
things from your Property page anytime.") instead.

**D8 — Health multipliers that actually work.** `adjustFrequencyForHealth`
now scales in days and returns `{ frequencyValue, frequencyUnit }`, downshifting
units when needed (1 month × 0.5 → 2 weeks; 1 year × 0.5 → 6 months). The five
dead `1.5` multipliers are removed from templates (inverted semantics, never
applied). Content test enforces: all multipliers < 1 and all effective.

## Out of scope (Phase 2/3)
Timezone-aware scheduling, notification preferences, active-home/homeId
plumbing, account deletion, template_id migration, bulk actions, search,
"not sure" interactive chips, member roles.
