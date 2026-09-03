-- Security: the app talks to Postgres only through the server's pg pool
-- (DATABASE_URL), never through PostgREST. The 0001 migration granted the
-- `authenticated` role full table access, which let any signed-in user write
-- their own public.users row (including email) with the public anon key —
-- an invite-hijack primitive, since invite auto-accept matches on users.email.
--
-- Revoke all PostgREST-visible table access. RLS stays enabled as
-- defense-in-depth; policies become unreachable, which is fine because no
-- app code path uses supabase.from(...).
--
-- NOTE: this does NOT touch the auth or storage schemas — Supabase Auth and
-- Storage are unaffected.

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Future tables created by db:push must not be exposed by default either.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated, anon;
