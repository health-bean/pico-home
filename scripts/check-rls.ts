/**
 * Fails if any table in `public` has Row Level Security off, or if the
 * `ensure_rls` event trigger (drizzle/0020_rls_guard.sql) is missing.
 *
 * Supabase serves every `public` table over its REST API with the anon key,
 * so a table without RLS is open to anyone with the project URL.
 *
 * Run: npm run db:check-rls  (also runs after npm run db:push)
 * Uses the app's own DB connection (src/lib/db), TLS verification included.
 */
import { sql } from "drizzle-orm";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set (try: npx tsx --env-file=.env.local ...)");
    process.exit(2);
  }
  const { db } = await import("../src/lib/db");

  const open = await db.execute<{ name: string }>(sql`
    select c.relname as name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
    order by 1`);

  const guard = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from pg_event_trigger
    where evtname = 'ensure_rls' and evtenabled <> 'D'`);

  let failed = false;
  if (open.rows.length > 0) {
    failed = true;
    console.error("Tables open to the Supabase REST API (RLS off):");
    for (const t of open.rows) console.error(`  - ${t.name}`);
    console.error("Fix: ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;");
  }
  if (guard.rows[0]?.n === 0) {
    failed = true;
    console.error("The ensure_rls event trigger is missing. Apply drizzle/0020_rls_guard.sql.");
  }
  if (!failed) console.log("RLS check passed: every public table has RLS on, and the guard is installed.");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
