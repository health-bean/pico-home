import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const checks: Record<string, string> = {};

  // Check env vars
  checks.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "MISSING";
  checks.SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "MISSING";
  checks.DATABASE_URL = process.env.DATABASE_URL ? "set" : "MISSING";

  // Check DB connection
  try {
    const result = await db.execute(sql`SELECT 1 as ok`);
    checks.database = "connected";
  } catch (error) {
    checks.database = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  // Check if key tables exist
  try {
    await db.execute(sql`SELECT count(*) FROM users`);
    checks.users_table = "ok";
  } catch (error) {
    checks.users_table = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  try {
    await db.execute(sql`SELECT count(*) FROM household_health_flags`);
    checks.household_health_flags_table = "ok";
  } catch (error) {
    checks.household_health_flags_table = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
  }

  const allOk = !Object.values(checks).some((v) => v.startsWith("ERROR") || v === "MISSING");

  return NextResponse.json({ status: allOk ? "healthy" : "unhealthy", checks }, { status: allOk ? 200 : 500 });
}
