// Applies the Phase-0 database fixes to the DATABASE_URL in .env.local:
//   drizzle/0008_backfill_dangerous_copy.sql   (corrects CO/panel copy on existing tasks)
//   drizzle/0009_revoke_postgrest_access.sql   (closes the PostgREST invite-hijack path)
// Both are idempotent — safe to re-run.
//
// Run with:  node scripts/apply-phase0-sql.mjs
import fs from "node:fs";
import pg from "pg";

const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/^DATABASE_URL=(.+)$/m);
if (!match) throw new Error("DATABASE_URL not found in .env.local");

const pool = new pg.Pool({ connectionString: match[1].trim(), ssl: { rejectUnauthorized: false } });

const files = [
  "drizzle/0008_backfill_dangerous_copy.sql",
  "drizzle/0009_revoke_postgrest_access.sql",
];

for (const file of files) {
  const sql = fs.readFileSync(file, "utf8");
  await pool.query(sql);
  console.log(`applied ${file}`);
}

const { rows } = await pool.query(
  `SELECT grantee, count(*)::int AS grants FROM information_schema.role_table_grants
   WHERE table_schema = 'public' AND grantee IN ('authenticated', 'anon') GROUP BY grantee`
);
console.log("remaining public-table grants for anon/authenticated:", rows.length ? rows : "none ✓");
await pool.end();
