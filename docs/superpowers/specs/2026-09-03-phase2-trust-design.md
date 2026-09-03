# Phase 2 — Trust & Household — Design Spec

Source: pre-launch audit §12 Phase 2. Branch: feat/phase-2-trust.

## Decisions

**D1 — Account deletion.** Settings gains a Danger Zone row → confirm screen →
`DELETE /api/user`. Server behavior: for each home where the user is owner —
if other members exist, transfer ownership to the longest-tenured member
(update `homes.user_id` + promote their `home_members.role`); else delete the
home (cascades). Then delete the user's memberships, push subscriptions,
notification prefs, and `users` row. Auth-user deletion is best-effort via
Supabase admin API when `SUPABASE_SERVICE_ROLE_KEY` is configured; otherwise
the orphaned auth user can re-sign-up safely because user creation now
upserts on `auth_id` (D2). Requires migration 0011: `task_completions.completed_by`
nullable + `ON DELETE SET NULL`; same for `home_members.invited_by`,
`home_invites.invited_by`.

**D2 — Re-signup safety.** `auth/callback` and `onboarding` user creation use
`ON CONFLICT (auth_id) DO UPDATE` upsert; a deleted-and-returning user gets a
fresh row instead of a unique-email 500. Email conflict (same email, new
auth_id) also updates the existing row's auth_id — the verified Supabase email
is the identity.

**D3 — Completion attribution.** `/api/tasks` response gains
`lastCompletedBy: string | null` (name of the most recent non-skipped
completer, one grouped query). Task detail shows "Last Completed:
Sep 15, 2026 · by Dee". Answers "did you do the filter?" without asking.

**D4 — Invitee first-run.** When `memberRole === "member"` and the user has
zero completions, the dashboard welcome card becomes: "You've been added to
{home}. Anything on the list is shared — check something off and everyone
sees it." (owner instructions hidden).

**D5 — Notifications honor consent.** push/notify: skip users whose prefs say
`pushEnabled: false` (absent row = default true). weekly-digest: LEFT JOIN so
users without a prefs row get the default (weeklyDigest true) — but only send
when `emailEnabled` is true OR the user has no row at all? No: digest sends
require `weeklyDigest !== false` AND `emailEnabled !== false` with absent row
treated as defaults (true/false per DEFAULTS → digest true, email false ⇒
absent row = no email). Resolve the DEFAULTS contradiction: emailEnabled
default becomes true (digest is the only email; the settings toggle already
implies consent management). Push cron time moves 09:00→13:00 UTC (9am ET /
6am PT) — proper per-timezone delivery needs hourly crons (plan-dependent),
deferred. Idempotency: `notification_log` table (0011) with
`UNIQUE(user_id, kind, sent_on)`; both crons check-and-insert per user/day.

**D6 — Household flags editable.** Settings gains a "Household" section
(7 toggles) backed by `GET/PUT /api/household-health` operating on the user's
home. On save, non-custom active tasks whose name matches a template get
their frequency re-adjusted (`adjustFrequencyForHealth`); due dates are left
in place (next recurrence uses the new cadence). UI notes "applies from each
task's next completion".

**D7 — Frequency copy.** `formatFrequency(value, unit)` in task-constants:
"Weekly", "Every 2 weeks", "Monthly", "Every 3 months", "Yearly",
"Every 2 years", "One-time". Used in dashboard rows, task rows, task detail.
Kills "Every 1 months / Every 1 years".

**D8 — Small authz/data fixes.** Home-profile PATCH is owner-only.
`getUserHomes` orders by `joined_at` (deterministic "first home").
Destructive home-profile actions (delete system/appliance/document, remove
member) get a confirm step and error toasts instead of `// silently fail`.

## Out of scope (Phase 3)
Timezone-perfect delivery (hourly crons), template_id migration, query-layer
refactor, monolith decomposition, member permission levels, task search,
Capacitor shell.
