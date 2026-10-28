-- Supports the durable daily invite cap in POST /api/home/invite:
--   SELECT count(*) FROM home_invites
--   WHERE invited_by = $1 AND created_at >= now() - interval '24 hours'
-- Without it that count is a sequential scan on every invite.
--
-- home_invites is small, so a plain (non-CONCURRENTLY) build is fine and
-- keeps this runnable through scripts/apply-phase0-sql.mjs.
-- Idempotent — safe to re-run.

CREATE INDEX IF NOT EXISTS home_invites_invited_by_created_at_idx
  ON public.home_invites (invited_by, created_at);
