# Phase 1 — Core Loop (Make Day One Real) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** New users see 5-6 starter tasks due on day one, every other task gets a staggered/seasonal first due date, the score debuts helpful (never red), and Complete/Skip gain Undo with clearly explained actions.

**Architecture:** A new pure module `src/lib/tasks/initial-due.ts` owns first-due-date logic (stagger + seasonal anchor) and starter-task selection; the onboarding route uses it for the auto path and honors `taskSetups` (already in the API contract, previously always `[]`). A new "Quick check" wizard step populates `taskSetups`. Dashboard API always returns the score plus a `focus` list; complete/skip return an `undo` token consumed by a new `/api/tasks/[id]/undo` route and a toast action button.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Zod, Vitest, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-09-02-phase1-core-loop-design.md`

## Global Constraints

- All dates stored as `YYYY-MM-DD` via `.toISOString().split("T")[0]` (codebase convention; TZ-aware dates are Phase 2).
- TDD for all pure logic (vitest, `src/**/*.test.ts`); UI wiring verified by `tsc`, lint, and dev-server walkthrough.
- No new tables or columns. No changes to `getNextDueDate`'s recurrence behavior (only its stale docstring).
- Design tokens only — no raw hex in classNames.
- Commit after each task; run `npm test && npx tsc --noEmit` before every commit.

---

### Task 1: `initial-due.ts` — stagger + seasonal first due dates

**Files:**
- Create: `src/lib/tasks/initial-due.ts`
- Test: `src/lib/tasks/initial-due.test.ts`

**Interfaces:**
- Produces: `stableHash(s: string): number` (non-negative int); `getInitialDueDate(template: Pick<TaskTemplate, "id" | "seasonalMonths" | "frequencyUnit">, frequencyValue: number, frequencyUnit: FrequencyUnit, now?: Date): Date`

- [ ] **Step 1: Write failing tests** (`initial-due.test.ts`): seasonal template (`seasonalMonths: [4, 5]`, now = 2026-09-10) → due 2027-04-15; seasonal still ahead (`[10, 11]`, now = 2026-09-10) → 2026-10-15; current month counts (`[9]`, now = 2026-09-10) → 2026-09-15 only if day ≤ 15, else next year — assert the rule: nearest month with its 15th still ≥ now; non-seasonal monthly → due within 3..30 days of now; non-seasonal annual → within 3..365 days; weekly → within 0..6 days; `one_time` → today; determinism: same id twice → same date; different ids → (at least one of 5 known ids) different offsets.
- [ ] **Step 2: Run** `npx vitest run src/lib/tasks/initial-due.test.ts` — expect module-not-found RED.
- [ ] **Step 3: Implement**

```ts
import type { TaskTemplate, FrequencyUnit } from "./templates";

export function stableHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

function cycleDays(value: number, unit: FrequencyUnit): number {
  switch (unit) {
    case "days": return value;
    case "weeks": return value * 7;
    case "months": return value * 30;
    case "years": return value * 365;
    case "one_time": return 0;
  }
}

/**
 * First due date for a newly created task with unknown history.
 * - Seasonal templates anchor to the 15th of the nearest upcoming seasonal month.
 * - Everything else staggers deterministically across its cycle window so
 *   cohorts don't land on a single day (the old behavior: today + cycle).
 * - one_time: due today.
 */
export function getInitialDueDate(
  template: Pick<TaskTemplate, "id" | "seasonalMonths">,
  frequencyValue: number,
  frequencyUnit: FrequencyUnit,
  now: Date = new Date()
): Date {
  if (frequencyUnit === "one_time") return new Date(now);

  if (template.seasonalMonths.length > 0) {
    const candidates = template.seasonalMonths
      .flatMap((m) => [
        new Date(now.getFullYear(), m - 1, 15),
        new Date(now.getFullYear() + 1, m - 1, 15),
      ])
      .filter((d) => d.getTime() >= now.getTime())
      .sort((a, b) => a.getTime() - b.getTime());
    if (candidates.length > 0) return candidates[0];
  }

  const days = Math.min(cycleDays(frequencyValue, frequencyUnit), 365);
  const minOffset = days <= 7 ? 0 : 3;
  const span = Math.max(days - minOffset, 1);
  const offset = minOffset + (stableHash(template.id) % span);
  const due = new Date(now);
  due.setDate(due.getDate() + offset);
  return due;
}
```

- [ ] **Step 4: Run tests** — expect PASS.
- [ ] **Step 5: Commit** `feat: initial due dates — seasonal anchoring and deterministic stagger`

---

### Task 2: Starter task selection

**Files:**
- Modify: `src/lib/tasks/initial-due.ts`
- Test: `src/lib/tasks/initial-due.test.ts`

**Interfaces:**
- Produces: `STARTER_TEMPLATE_IDS: string[]`; `selectStarterTemplates(applicable: TaskTemplate[], max?: number): TaskTemplate[]` (order of STARTER_TEMPLATE_IDS, capped at `max` = 6)

- [ ] **Step 1: Failing tests**: given a typical applicable set (smoke, CO, gfci, water-heater-temp, hvac filter, dryer vent, + 20 others), returns exactly the starter ones in starter order, capped at 6; given an applicable set with only 2 starters, returns 2; never returns a template not in the applicable list.
- [ ] **Step 2: RED run.**
- [ ] **Step 3: Implement** (append to `initial-due.ts`):

```ts
/** High-value, low-effort tasks that make day one real. Order = priority. */
export const STARTER_TEMPLATE_IDS: string[] = [
  "safety-test-smoke-detectors",
  "safety-test-co-detectors",
  "hvac-replace-filter",
  "safety-clean-dryer-vent",
  "electrical-test-gfci",
  "health-verify-water-heater-temp",
  "plumbing-check-toilets",
  "garage-test-auto-reverse",
];

export function selectStarterTemplates(
  applicable: TaskTemplate[],
  max = 6
): TaskTemplate[] {
  const byId = new Map(applicable.map((t) => [t.id, t]));
  const picked: TaskTemplate[] = [];
  for (const id of STARTER_TEMPLATE_IDS) {
    const t = byId.get(id);
    if (t) picked.push(t);
    if (picked.length >= max) break;
  }
  return picked;
}
```

- [ ] **Step 4: GREEN run. Step 5: Commit** `feat: starter task selection for day-one seeding`

---

### Task 3: Health multipliers scale in days (units downshift)

**Files:**
- Modify: `src/lib/tasks/scheduling.ts` (`adjustFrequencyForHealth`), `src/lib/tasks/templates.ts` (remove the five `1.5` multipliers: boiler-annual-service, evap-cooler-seasonal-startup, mini-split-professional-service, solar-panel-inspection, solar-panel-cleaning), `src/app/api/onboarding/route.ts` (both call sites use `.frequencyValue`/`.frequencyUnit` from the new return)
- Test: `src/lib/tasks/scheduling.test.ts` (update multiplier tests), `src/lib/tasks/template-content.test.ts` (add invariant)

**Interfaces:**
- Produces: `adjustFrequencyForHealth(frequencyValue, frequencyUnit, multipliers, flags): { frequencyValue: number; frequencyUnit: FrequencyUnit }`

- [ ] **Step 1: Failing tests**: `1 month × 0.5` → `{2, "weeks"}`; `1 year × 0.5` → `{6, "months"}`; `3 months × 0.5` → `{6, "weeks"}` or `{45, "days"}` — assert the rule: result ≈ half the days (±10%) and unit is the largest that divides cleanly (years if ≥365 and %365==0 → else months if %30==0 → else weeks if %7==0 → else days); no matching flag → unchanged value+unit; `12 months × 0.25` → `{3, "months"}`. Content invariant: every template's multipliers all `< 1`, and for each, applying it with its flag changes the effective day count.
- [ ] **Step 2: RED.**
- [ ] **Step 3: Implement** in `scheduling.ts` (replace the old function):

```ts
export function adjustFrequencyForHealth(
  frequencyValue: number,
  frequencyUnit: FrequencyUnit,
  multipliers: Partial<Record<HealthFlagKey, number>>,
  flags: HealthFlags
): { frequencyValue: number; frequencyUnit: FrequencyUnit } {
  let lowest = 1;
  for (const [key, m] of Object.entries(multipliers)) {
    if (flags[key as HealthFlagKey] && m < lowest) lowest = m;
  }
  if (lowest === 1 || frequencyUnit === "one_time") {
    return { frequencyValue, frequencyUnit };
  }
  const toDays: Record<Exclude<FrequencyUnit, "one_time">, number> = {
    days: 1, weeks: 7, months: 30, years: 365,
  };
  const days = Math.max(1, Math.round(frequencyValue * toDays[frequencyUnit] * lowest));
  if (days % 365 === 0) return { frequencyValue: days / 365, frequencyUnit: "years" };
  if (days % 30 === 0) return { frequencyValue: days / 30, frequencyUnit: "months" };
  if (days % 7 === 0) return { frequencyValue: days / 7, frequencyUnit: "weeks" };
  return { frequencyValue: days, frequencyUnit: "days" };
}
```

Update both onboarding-route call sites: `const adjusted = adjustFrequencyForHealth(template.frequencyValue, template.frequencyUnit, template.healthMultipliers, healthFlags);` then use `adjusted.frequencyValue` / `adjusted.frequencyUnit` everywhere the old single value + `template.frequencyUnit` were used (including `getNextDueDate` / `getInitialDueDate` arguments and the inserted row).

- [ ] **Step 4: GREEN (full `npm test`). Step 5: Commit** `fix: health multipliers scale in days and downshift units — no more rounding no-ops`

---

### Task 4: Onboarding route — starters due today, stagger/seasonal for the rest

**Files:**
- Modify: `src/app/api/onboarding/route.ts`

**Interfaces:**
- Consumes: `getInitialDueDate`, `selectStarterTemplates` (Tasks 1-2), new `adjustFrequencyForHealth` (Task 3).
- Produces: `taskSetups[].state === "track"` ⇒ `nextDueDate = today`; auto path uses `getInitialDueDate`; response gains `starterTaskIds: string[]` (template ids seeded due today).

- [ ] **Step 1:** In the `userTaskValues` map, replace the `nextDueDate` computation: `state === "done"` keeps `getNextDueDate(adjusted.frequencyValue, adjusted.frequencyUnit, lastCompletedDate)`; `state === "track"` uses `new Date()` (due today).
- [ ] **Step 2:** In the `autoTaskValues` map, compute `const isStarter = starterIds.has(template.id);` where `starterIds = new Set(selectStarterTemplates(applicableTemplates).map(t => t.id))` (computed once above the map). `nextDueDate = isStarter ? new Date() : getInitialDueDate(template, adjusted.frequencyValue, adjusted.frequencyUnit)`.
- [ ] **Step 3:** Add `starterTaskIds: [...starterIds]` to the success response.
- [ ] **Step 4:** `npx tsc --noEmit && npm test` — PASS. **Step 5: Commit** `feat: day-one seeding — starters due today, staggered/seasonal first due dates`

---

### Task 5: Onboarding UI — "Quick check" step + payload

**Files:**
- Modify: `src/app/onboarding/shared.tsx` (add `StepQuickCheck`, extend `FormData` with `taskSetups: Record<string, "track" | "done">`), `src/app/onboarding/page.tsx` (TOTAL_STEPS 4→5, step wiring, `buildApiPayload`)

**Interfaces:**
- Consumes: `getApplicableTemplates` + `selectStarterTemplates` client-side (route-chunk only; templates.ts is code-split into the onboarding route bundle).
- Produces: payload `taskSetups: [{ templateId, state: "track" } | { templateId, state: "done", doneMonth, doneYear }]` for each starter candidate.

- [ ] **Step 1:** `FormData` gains `taskSetups: Record<string, "track" | "done">` (default `{}`); `initialSelectedItems` untouched; add to the draft-persistence shape.
- [ ] **Step 2:** `StepQuickCheck` component in shared.tsx: computes candidates via `selectStarterTemplates(getApplicableTemplates(homeFromForm))` where `homeFromForm` mirrors `buildApiPayload`'s systems/appliances mapping (extract that mapping into an exported `buildHomeSelection(form)` helper in shared.tsx used by both). Renders each candidate as a card: template name + one-line `whyItMatters` first sentence; two chip buttons — "Done recently" / "Put it on my list" (default). Copy at top: "Last one — have you done any of these lately?" subtitle "Anything you haven't (or can't remember) goes on your list for this week." ContinueButton label "Finish setup". Skip link (submits with all defaults).
- [ ] **Step 3:** page.tsx: `TOTAL_STEPS = 5`; step 4 (Household) `onNext`/`onSkip` now `next()` instead of submit; new `step === 5` renders `StepQuickCheck` whose `onNext`/`onSkip` call `handleSubmitAndComplete()`; completion screen becomes `step === 6`; progress-bar condition `step < 6`.
- [ ] **Step 4:** `buildApiPayload` builds `taskSetups`: for each candidate id, `form.taskSetups[id] === "done"` → `{ templateId: id, state: "done", doneMonth: new Date().getMonth() + 1, doneYear: new Date().getFullYear() }`, else `{ templateId: id, state: "track" }`.
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint` clean; dev-server walkthrough of the wizard (visual). **Step 6: Commit** `feat: Quick check onboarding step — seed day one from what the user already did`

---

### Task 6: Onboarding — "Around the house" appliance group + reassurance copy

**Files:**
- Modify: `src/app/onboarding/shared.tsx` (`MAJOR_SYSTEMS`, group rendering)

- [ ] **Step 1:** Append group `{ label: "Around the house", items: [...] }` with appliance items (key/label/icon/mappedAppliance): dryer 🌀, washing_machine 🧺, dishwasher 🍽️, refrigerator 🧊, oven_range 🍳, garbage_disposal 🌪️, garage_door 🚪, sump_pump 🕳️, water_softener 🧂. Add `defaultChecked?: true` to `HomeItem`; set it on dryer/washing_machine/dishwasher/refrigerator/oven_range; `initialSelectedItems()` enables `defaultChecked` items.
- [ ] **Step 2:** Group header rendering gains a muted reassurance line: "Not sure? Skip it — you can add anything later from your Property page." (once, under the step subtitle, not per group).
- [ ] **Step 3:** tsc + lint + visual check. **Step 4: Commit** `feat: onboarding asks about everyday appliances — dryer vent and washer-hose tasks now reachable`

---

### Task 7: Dashboard API — score always on, focus list, all-time completions

**Files:**
- Modify: `src/app/api/dashboard/route.ts`

**Interfaces:**
- Produces: response fields `score` (never null when home exists), `completionsAllTime: number`, `focus: { id, name, nextDueDate, priority }[]` (≤3: overdue first, then due within 7 days; `safety` priority first within each group, then by date).

- [ ] **Step 1:** Delete the `hasTasksDue` gate (`const score = computedScore;`).
- [ ] **Step 2:** Build `focus`: `[...overdueTasks].sort(safetyFirstThenDate)` concat `[...upcomingTasks].sort(safetyFirstThenDate)`, slice 3, map to the four fields. `safetyFirstThenDate = (a, b) => (a.priority === "safety" ? 0 : 1) - (b.priority === "safety" ? 0 : 1) || a.nextDueDate.localeCompare(b.nextDueDate)`.
- [ ] **Step 3:** `completionsAllTime`: reuse the completions join without the date filter — `select({ n: sql<number>\`count(*)\` })` version, single row.
- [ ] **Step 4:** tsc + tests. **Step 5: Commit** `feat: dashboard always returns score, plus focus tasks and all-time completion count`

---

### Task 8: Dashboard UI — helpful debut, tappable ring, welcome links

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1:** Type gains `completionsAllTime: number; focus: FocusTask[]`. Remove the `score === null` placeholder branch (keep a loading skeleton only).
- [ ] **Step 2:** Debut mode = `completionsAllTime === 0`: score number renders in `text-[var(--color-primary-700)]` regardless of value, mood line replaced with "Every home starts somewhere — start with your starter tasks."; otherwise existing color logic, except the `< 60` red state's copy becomes actionable: "Needs attention — start with: {focus[0].name}".
- [ ] **Step 3:** Wrap the score ring in a `<Link href="/tasks">` with `aria-label="See what's driving your score"`.
- [ ] **Step 4:** Welcome-card instruction lines become `<Link href="/tasks">` / `<Link href="/home-profile">` links; card shows when `completionsAllTime === 0` (not `!score`).
- [ ] **Step 5:** tsc + lint + visual check. **Step 6: Commit** `feat: score debuts helpful — never red on first contact, ring links to tasks`

---

### Task 9: Undo for Complete and Skip

**Files:**
- Modify: `src/components/ui/toast.tsx` (action support), `src/app/api/tasks/[id]/complete/route.ts`, `src/app/api/tasks/[id]/skip/route.ts` (return undo token), `src/lib/api/schemas.ts` (undo schema), `src/app/(app)/tasks/page.tsx`, `src/app/(app)/dashboard/page.tsx` (wire toast action)
- Create: `src/app/api/tasks/[id]/undo/route.ts`
- Test: `src/lib/api/schemas.test.ts` (undo schema cases)

**Interfaces:**
- Produces: complete/skip responses gain `undo: { completionId, previousNextDueDate, previousLastCompletedDate, previousIsActive }`; `POST /api/tasks/[id]/undo` accepts that object, returns `{ success: true }`; `toast(message, variant, action?: { label: string, onClick: () => void })` with 8s duration when action present.

- [ ] **Step 1 (RED):** schema test — `undoTaskSchema` accepts `{ completionId: uuid, previousNextDueDate: "2026-01-31", previousLastCompletedDate: null, previousIsActive: true }`, rejects bad uuid / bad date / missing fields.
- [ ] **Step 2 (GREEN):** `undoTaskSchema = z.object({ completionId: z.string().uuid(), previousNextDueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), previousLastCompletedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), previousIsActive: z.boolean() })`.
- [ ] **Step 3:** complete route: capture `const previous = { nextDueDate: task.nextDueDate, lastCompletedDate: task.lastCompletedDate, isActive: task.isActive ?? true };` before updating; `.returning({ id: taskCompletions.id })` on the insert; response gains `undo: { completionId, previousNextDueDate: previous.nextDueDate, previousLastCompletedDate: previous.lastCompletedDate, previousIsActive: previous.isActive }`. Same pattern in skip.
- [ ] **Step 4:** undo route (mirror of the action routes): `authorizeTaskAccess`, parse `undoTaskSchema`, verify the completion row exists and `taskInstanceId === task.id`, delete it, update the task with the three previous fields, then recalculate + upsert the score exactly as the complete route does (extract that block into `recalculateHomeScore(homeId)` in `src/lib/tasks/score-store.ts` and use it from both routes).
- [ ] **Step 5:** toast.tsx: `Toast` gains optional `action`; `toast()` third arg; timeout 8000 when action present; render a text button before the dismiss X that calls `action.onClick()` then removes the toast.
- [ ] **Step 6:** tasks/dashboard pages: on complete/skip success, `toast("Task completed", "success", { label: "Undo", onClick: () => undoTask(taskId, data.undo) })`; `undoTask` POSTs to `/api/tasks/${id}/undo` and refetches.
- [ ] **Step 7:** Full test + tsc + manual walkthrough. **Step 8: Commit** `feat: undo for complete and skip`

---

### Task 10: Action clarity — sublabels, safety-dismiss confirm, snooze from today

**Files:**
- Modify: `src/app/(app)/tasks/task-detail-dialog.tsx`, `src/app/api/tasks/[id]/snooze/route.ts`
- Test: extend `src/lib/tasks/scheduling.test.ts`? No — snooze logic is inline; add `src/app/api/tasks/snooze-base.test.ts` only if extracted. Extract `snoozeBaseDate(nextDueDate: string, now?: Date): Date` into `src/lib/tasks/scheduling.ts` with tests.

- [ ] **Step 1 (RED):** `snoozeBaseDate("2026-01-01", new Date("2026-09-02"))` → 2026-09-02 (overdue snoozes from today); `snoozeBaseDate("2026-12-01", ...)` → 2026-12-01 (future snoozes from due date).
- [ ] **Step 2 (GREEN):** `export function snoozeBaseDate(nextDueDate: string, now: Date = new Date()): Date { const due = new Date(nextDueDate); return due.getTime() < now.getTime() ? new Date(now) : due; }` — snooze route uses it: `const base = snoozeBaseDate(task.nextDueDate); base.setDate(base.getDate() + body.days);`
- [ ] **Step 3:** Dialog actions become a stacked list (full-width rows, icon + label + muted sublabel): Complete — "Logs it and schedules the next one"; Skip — "Not this time — moves to the next cycle, no credit"; Snooze — "Remind me again in 7 days". Keep Complete as the visually primary row.
- [ ] **Step 4:** Dismiss: clicking "Not relevant" on a `task.priority === "safety"` task swaps the link for an inline confirm block: "This is a safety task. Dismiss anyway?" [Dismiss] [Keep it] (state `confirmingDismiss`). Non-safety unchanged.
- [ ] **Step 5:** tsc + lint + tests + walkthrough. **Step 6: Commit** `feat: explained task actions, safety-dismiss confirmation, snooze counts from today`

---

### Task 11: Verification sweep

- [ ] `npm test` (all green), `npx tsc --noEmit`, `npm run lint`.
- [ ] `pkill -f "next dev"; npx next build` passes; restart dev.
- [ ] Reset a test account (`POST /api/dev/reset-onboarding` — confirm with the owner first), run the full wizard, verify: Quick check appears with ≤6 starters; dashboard day one shows starters due today, a score, and focus items; tasks list shows staggered dates and seasonal tasks in sane months; complete → Undo toast → undo restores.
- [ ] Update `docs/feature-inventory.csv` if present rows cover these features.
- [ ] Commit any stragglers; summarize for the owner.
