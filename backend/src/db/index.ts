import pg from "pg";

// Ensure .env is loaded even when the backend is started from a different cwd
// (monorepo setups often keep the .env at the repo root).
import { loadEnv } from "../lib/env";

loadEnv();

const { Pool, types } = pg;

// Parse BIGINT (int8) carefully:
// - Return number when it's within JS safe integer range
// - Otherwise return string to avoid silent precision loss
types.setTypeParser(20, (val) => {
  try {
    const n = BigInt(val);
    const max = BigInt(Number.MAX_SAFE_INTEGER);
    const min = -max;
    if (n <= max && n >= min) return Number(n);
    return val; // keep as string
  } catch {
    return val;
  }
});

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
