import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { SUPABASE_ROOT_CA } from "./supabase-ca";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: process.env.NODE_ENV === "production" ? 20 : 5,
  ssl: process.env.DATABASE_URL?.includes("supabase")
    ? { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true }
    : false,
});

export const db = drizzle(pool, { schema });
export type Database = typeof db;
