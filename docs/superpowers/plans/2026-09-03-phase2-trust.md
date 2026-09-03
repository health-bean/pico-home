# Phase 2 — Trust & Household Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Households can trust the app together — safe account deletion, visible attribution, honest notifications, editable health flags, confirmed destructive actions, and human frequency copy.

**Architecture:** One SQL migration (0011) unlocks user deletion and notification idempotency. New routes: `DELETE /api/user`, `GET/PUT /api/household-health`. Cron routes gain consent + send-log guards. UI: Settings (danger zone + household section), dashboard invitee card, task detail attribution, home-profile confirms.

**Tech Stack:** Next.js 16, Drizzle/pg, Zod, Vitest, Supabase admin API (optional).

**Spec:** `docs/superpowers/specs/2026-09-03-phase2-trust-design.md`

## Global Constraints
- Migrations are hand-applied via `scripts/apply-phase0-sql.mjs`-style runner (journal is broken); every new SQL file is idempotent.
- TDD for pure logic; route/UI wiring verified by tsc + lint + walkthrough.
- No breaking API changes for existing clients.

### Task 1: Migration 0011 + schema updates (deletion FKs, notification_log)
Create `drizzle/0011_deletion_and_notification_log.sql`: `ALTER TABLE task_completions ALTER COLUMN completed_by DROP NOT NULL;` + `DROP CONSTRAINT`/`ADD CONSTRAINT ... ON DELETE SET NULL` for `task_completions.completed_by`, `home_members.invited_by`, `home_invites.invited_by`; `CREATE TABLE IF NOT EXISTS notification_log (id uuid pk default gen_random_uuid(), user_id uuid not null references users(id) on delete cascade, kind text not null, sent_on date not null, created_at timestamptz not null default now(), unique(user_id, kind, sent_on));` + RLS enable, no policies. Mirror in `src/lib/db/schema.ts` (completedBy nullable + notificationLog table). Update `scripts/apply-phase0-sql.mjs` files list → rename concept to apply-sql. tsc + tests + commit.

### Task 2: formatFrequency (TDD)
`src/app/(app)/tasks/task-constants.ts` exports `formatFrequency(value: number, unit: string): string`. Tests in `src/lib/tasks/format-frequency.test.ts` (import from task-constants): (1,"weeks")→"Weekly"; (2,"weeks")→"Every 2 weeks"; (1,"months")→"Monthly"; (3,"months")→"Every 3 months"; (1,"years")→"Yearly"; (2,"years")→"Every 2 years"; (1,"one_time")→"One-time"; (10,"days")→"Every 10 days". Replace "Every {value} {unit}" renderings in dashboard rows, tasks rows, task-detail grid. Commit.

### Task 3: Attribution (lastCompletedBy)
`/api/tasks` GET: one extra query — latest non-skipped completion per task instance joined to users; merge `lastCompletedBy` into response rows. Task type + detail dialog "Last Completed" line gains "· by {name}". Commit.

### Task 4: Re-signup upsert (TDD-adjacent; verified by tsc)
`auth/callback` + `onboarding` user insert → `.onConflictDoUpdate({ target: users.authId, set: { email, name, avatarUrl, updatedAt } })`; second upsert path on email conflict: catch unique-email error → update existing row's authId by email. Extract shared `upsertAppUser(authUser)` into `src/lib/auth/upsert-user.ts`, used by both. Commit.

### Task 5: DELETE /api/user + Settings danger zone
`src/app/api/user/route.ts` DELETE: for each owned home (homes.user_id = user.id): other members? → transfer to oldest member (`ORDER BY joined_at`), update homes.user_id + role='owner'; else delete home. Delete memberships, pushSubscriptions, notificationPreferences, users row (transaction). Best-effort `supabase.auth.admin.deleteUser` when `SUPABASE_SERVICE_ROLE_KEY` present (server-only client). Response `{ success, authDeleted }`. Settings: "Delete account" row → inline confirm (type-nothing, two-step button) → call → signOut redirect. Commit.

### Task 6: Notification consent + send log
push/notify: fetch prefs map; skip `pushEnabled === false`; wrap per-user loop in try/catch; check/insert notification_log (kind 'push_overdue', sent_on = UTC date) — skip if exists. weekly-digest: LEFT JOIN prefs with defaults (weeklyDigest true, emailEnabled **true** — change DEFAULTS.emailEnabled to true in settings route), require both; same send-log (kind 'weekly_digest'). vercel.json: push cron 0 9 → 0 13. Commit.

### Task 7: Household flags in Settings
`src/app/api/household-health/route.ts`: GET (flags for `getUserHome(user.id)` home, defaults false), PUT (upsert `householdHealthFlags`, then re-adjust matching non-custom active tasks: load templates by name match, recompute adjustFrequencyForHealth, update frequencyValue/Unit where changed). Settings "Household" section: 7 toggles (reuse HEALTH_OPTIONS labels), optimistic, note "affects each task's next cycle". Commit.

### Task 8: Invitee first-run + welcome variant
Dashboard: when `data.memberRole === "member" && isDebut`, welcome card renders invitee copy ("You've been added to {home.name}…"), owner list hidden. API already returns memberRole. Commit.

### Task 9: Owner-only PATCH, deterministic home order, confirmed destructive actions
`home-profile/route.ts` PATCH: 403 unless `home.memberRole === "owner"`. `get-user-home.ts` getUserHomes: `ORDER BY home_members.joined_at`. Home-profile page: delete system/appliance/document + remove member get a two-tap inline confirm; every `// silently fail` catch gets `toast("Couldn't …", "error")` (import useToast). Commit.

### Task 10: Verification sweep
Full tests + tsc + lint + `next build`; dev-server walkthrough: settings toggles/household/danger-zone render; task rows show "Monthly/Yearly"; task detail shows attribution after completing; commit stragglers; apply migration 0011 (user runs script); update audit artifact changelog if warranted.
