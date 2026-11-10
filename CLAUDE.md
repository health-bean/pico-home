# Pico Home — project conventions

Home-maintenance tracker. Next.js 16 App Router · React 19 · Tailwind 4 ·
Drizzle/pg on Supabase Postgres · Supabase Auth · Resend · web-push · Vitest.
Prod: picohome.app (Vercel project name is legacy "honeydo-iq"; same for the
Sentry project).

## Commands
- `npm run dev` · `npm test` · `npx tsc --noEmit` · `npm run lint`
- Verify all three before every commit. Production build: `npx next build`
  (stop `next dev` first — they share `.next`).

## Hard-won rules
- **TDD for logic** (templates matching, scheduling, schemas): failing test
  first in `src/**/*.test.ts`. UI wiring is verified by tsc + walkthrough.
- **Migrations**: the Drizzle journal is broken — do NOT use `db:generate`/
  `db:migrate`. Add idempotent SQL as `drizzle/00NN_*.sql`, register it in
  `scripts/apply-phase0-sql.mjs`, and the operator runs that script. Mirror
  every change in `src/lib/db/schema.ts` by hand.
- **DB access is API-only**: the browser never reads tables (PostgREST grants
  revoked in 0009). New tables: enable RLS, add no policies, never re-grant
  `anon`/`authenticated`.
  The `ensure_rls` event trigger (0020) turns RLS on automatically for any
  new `public` table, hand-made backups included; `npm run db:check-rls`
  verifies (also runs after `db:push`).
- **Every route** goes through `apiHandler` (auth, CSRF, rate limit) and
  verifies home membership via `getUserHome`/`authorizeTaskAccess` for any
  client-supplied id.
- **Design tokens only** — no hex in classNames; color scales live in
  `@theme` in `src/styles/tokens.css`. Primary CTA is primary-700 (AA).
  Meta text ≥ neutral-500.
- **Copy promises nothing unbuilt.** If a control does nothing yet, remove it.
  Error paths surface a toast — never `// silently fail`, never `alert()`.
- **Frequencies** render via `formatFrequency()` (never "Every 1 months").
- **Task templates** live in `src/lib/tasks/templates.ts`; instances snapshot
  copy at creation (no template_id yet), so template fixes need a name-keyed
  SQL backfill for existing rows. Content invariants are enforced by
  `template-content.test.ts` — keep them passing.
- **8 categories, homeowner language** ("Outdoors Stuff", not "Lawn &
  Exterior"). Realistic frequencies — if nobody would actually do it that
  often, it's wrong. Baseline = truly universal only; users dismiss the rest.
- **Scheduling**: first due dates come from `getInitialDueDate` (stagger +
  seasonal anchor); recurrence from `getNextDueDate`. Starters
  (`STARTER_TEMPLATE_IDS`) are due day one. Don't reintroduce
  `today + frequency` seeding.
- **Notifications** must respect prefs and log to `notification_log`
  (unique user/kind/day) before sending.
- Multi-home is deliberately hidden in V1 — don't resurrect "Add Another
  Property" without fixing `/api/homes` creation first.

## Testing/reset workflow
Owner (Dee) resets via `POST /api/dev/reset-onboarding` (dev/preview only)
plus `localStorage.clear()`; wife Amy is the second tester on the shared home.

## Docs
Notion "🏠 Pico Home Documentation Hub" is the product source of truth;
specs/plans in `docs/superpowers/`; audit report is a Claude artifact linked
from the hub. Update the hub when features ship.
