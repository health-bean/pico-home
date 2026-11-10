-- RLS on every public table, now and in future
-- Date: 2026-11-10
--
-- Supabase exposes every table in `public` through its REST API with the anon
-- key; a table without Row Level Security is open to anyone with the project
-- URL. Pico Health had two hand-made backup tables flagged for this on
-- 2026-11-08. All Pico Home tables already had RLS on; this guard keeps it so.
-- Idempotent: safe to re-run via scripts/apply-phase0-sql.mjs.

-- Guard: any table created in `public` from now on gets RLS on at once,
--    however it is made (drizzle push, a script, CREATE TABLE AS in the SQL editor).
CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION internal.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE object_type IN ('table', 'partitioned table')
      AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS ensure_rls;
CREATE EVENT TRIGGER ensure_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION internal.rls_auto_enable();
