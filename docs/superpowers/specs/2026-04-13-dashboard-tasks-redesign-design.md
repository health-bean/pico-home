# Dashboard & Task List Redesign — V1

**Date:** 2026-04-13
**Status:** Draft

## Problem

After onboarding, new users see 50+ tasks in a flat list sorted only by urgency, a 100% health score they didn't earn, and a dashboard that feels either empty (nothing overdue) or overwhelming. It doesn't feel curated or on-brand.

## Goals

1. Dashboard answers "what do I do now?" — focused, actionable, not overwhelming
2. Task list answers "what does my home need?" — organized by home system/category
3. Health score feels honest — no fake 100% on day one

## Design

### 1. Health Score — New User State

**Current:** Score starts at 100% for all new users.

**New:** Until at least one task has come due, show a placeholder state instead of a numeric score:
- Replace the score ring with a "building" illustration or simple icon
- Text: "Your score is building..." with subtitle "As tasks come due and you complete them, your home health score will appear here."
- Once the first task is due (i.e., `nextDueDate <= today` for any active task), calculate and show the real score

**Implementation:** In the dashboard API, check if any task has `nextDueDate <= today`. If none, return `score: null`. The dashboard component renders the placeholder when `score` is null.

### 2. Dashboard — Focused "Needs Attention"

No major structural changes needed. The dashboard already shows only overdue + next-7-days tasks, which is the right behavior. Minor refinements:

- When there are zero tasks needing attention AND score is null (new user), show a welcoming message: "You're all set for now. We'll let you know when your first tasks are due."
- Keep the existing urgency-based cards (overdue → due soon) for when tasks start coming due
- The "This Week" stats card (completed/remaining/spent) can stay but should hide when there's nothing to show yet

### 3. Task List Page — Category Grouping

**Current:** Flat list grouped only by urgency status (Overdue / Due This Week / Upcoming / Completed).

**New:** Primary grouping is by **category**, with urgency as secondary sort within each group.

#### Category Groups

Map the 14 task categories to user-friendly display groups:

| Display Group | Categories | Icon |
|---|---|---|
| Safety & Security | safety | shield |
| Heating & Cooling | hvac | thermometer |
| Plumbing & Water | plumbing | droplet |
| Electrical | electrical | zap |
| Roof & Gutters | roof_gutters | home |
| Exterior | exterior | trees |
| Windows & Doors | windows_doors | square |
| Appliances | appliance | refrigerator |
| Lawn & Landscape | lawn_landscape | flower |
| Pest Control | pest_control | bug |
| Garage | garage | warehouse |
| Pool & Hot Tub | pool | waves |
| Cleaning | cleaning | sparkles |
| Seasonal | seasonal | calendar |

#### Layout

- Each category is a collapsible section with header: icon + name + task count + overdue badge (if any overdue in that group)
- Sections with overdue tasks sort to the top
- Within each section, tasks sort: overdue first, then by nextDueDate ascending
- Sections default to collapsed, except those with overdue or due-this-week tasks
- Each task row shows: name, due date (relative), frequency, priority indicator, complete button

#### Filter Pills

Keep the existing filter pills (All / Overdue / Due Soon / Upcoming) but they now filter across the category view:
- "Overdue" shows only categories that have overdue tasks, with only overdue tasks visible
- "Due Soon" shows categories with tasks due in next 7 days
- "All" shows everything in category groups

### 4. What We're NOT Changing

- Task generation logic — the template matching is smart and contextual, the volume is fine when properly organized
- Dashboard structure — the urgency-based "needs attention" view is correct for the dashboard
- Task detail modal, complete/skip/snooze actions, add-task dialog — all stay as-is
- Mobile layout and navigation — no changes

## Files to Modify

- `src/app/api/dashboard/route.ts` — return `score: null` when no tasks are due yet
- `src/app/(app)/dashboard/page.tsx` — render placeholder score state, welcome message for new users
- `src/app/(app)/tasks/page.tsx` — category-grouped layout with collapsible sections
- No new files needed

## Out of Scope

- Gamification / progressive reveal (considered, deferred)
- Task recommendations / "quick wins" surfacing
- Category icons in dashboard (keep dashboard urgency-focused)
