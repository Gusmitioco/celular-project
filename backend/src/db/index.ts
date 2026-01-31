import pg from "pg";

// Ensure .env is loaded even when the backend is started from a different cwd
// (monorepo setups often keep the .env at the repo root).
import { loadEnv } from "../lib/env";

loadEnv();

const { Pool, types } = pg;

// Parse BIGINT (int8) as number (safe for your IDs)
types.setTypeParser(20, (val) => Number(val));

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL in environment");
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}
