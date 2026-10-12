// Confirms the app's DB connection settings (src/lib/db) can reach the
// database with TLS verification on. Runs SELECT 1 — reads no data.
//   npx tsx scripts/check-db-connection.ts
import fs from "node:fs";
import { sql } from "drizzle-orm";

async function main() {
  const match = fs.readFileSync(".env.local", "utf8").match(/^DATABASE_URL=(.+)$/m);
  if (!match) throw new Error("DATABASE_URL not found in .env.local");
  process.env.DATABASE_URL = match[1].trim().replace(/^"|"$/g, "");

  const { db } = await import("../src/lib/db");
  const result = await db.execute(sql`select 1 as ok`);
  console.log("Connected with certificate verification ✓", result.rows[0]);
  process.exit(0);
}

main().catch((err) => {
  console.error("Connection failed ✗", err.cause?.message ?? err.message);
  process.exit(1);
});
