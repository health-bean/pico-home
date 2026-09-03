-- Phase 2: unblock account deletion and make notification sends idempotent.
-- Idempotent — safe to re-run.

-- 1. FKs that referenced users with NO ACTION blocked deleting any user who
--    ever completed a task or sent an invite. History survives; the author
--    link becomes NULL.
ALTER TABLE task_completions ALTER COLUMN completed_by DROP NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'task_completions_completed_by_users_id_fk') THEN
    ALTER TABLE task_completions DROP CONSTRAINT task_completions_completed_by_users_id_fk;
  END IF;
  ALTER TABLE task_completions
    ADD CONSTRAINT task_completions_completed_by_users_id_fk
    FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'home_members_invited_by_users_id_fk') THEN
    ALTER TABLE home_members DROP CONSTRAINT home_members_invited_by_users_id_fk;
  END IF;
  ALTER TABLE home_members
    ADD CONSTRAINT home_members_invited_by_users_id_fk
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE constraint_name = 'home_invites_invited_by_users_id_fk') THEN
    ALTER TABLE home_invites DROP CONSTRAINT home_invites_invited_by_users_id_fk;
  END IF;
  ALTER TABLE home_invites
    ADD CONSTRAINT home_invites_invited_by_users_id_fk
    FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Send log: one row per user/kind/day makes cron retries and manual runs
--    idempotent (no double notifications).
CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  sent_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_log_user_kind_day_unique UNIQUE (user_id, kind, sent_on)
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
-- No policies: PostgREST access stays revoked (0009); only the server pool reads it.
