import fs from "fs";
import path from "path";
import dotenv from "dotenv";

let loaded = false;

/**
 * Load .env variables in a monorepo-friendly way.
 *
 * When running `npm run dev` from `backend/`, `dotenv.config()` would only look
 * for `backend/.env` by default. Many setups keep the .env at the repo root.
 *
 * This function searches a few sensible locations and is safe to call multiple
 * times.
 */
export function loadEnv(): void {
  if (loaded) return;

  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, ".env"),
    path.resolve(cwd, "backend", ".env"),
    path.resolve(cwd, "..", ".env"),
    path.resolve(cwd, "..", "..", ".env"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p, override: false });
      break;
    }
  }

  // Also load from process env (docker, CI, etc). `dotenv.config` is additive.
  loaded = true;
}

export function requiredEnv(name: string): string {
  loadEnv();
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function optionalEnv(name: string): string | undefined {
  loadEnv();
  return process.env[name] || undefined;
}

// Common values (do not force DATABASE_URL to exist at import time)
loadEnv();

export const fixedCity =
  process.env.DEFAULT_CITY_NAME || process.env.FIXED_CITY || "Teixeira de Freitas";

export const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
export const port = Number(process.env.PORT || 3001);

export const adminUser = process.env.ADMIN_USER || process.env.ADMIN_USERNAME || "owner";
export const adminPass = process.env.ADMIN_PASS || process.env.ADMIN_PASSWORD || "";
export const adminJwtSecret =
  process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || "";

export const defaultStoreId = process.env.DEFAULT_STORE_ID
  ? Number(process.env.DEFAULT_STORE_ID)
  : undefined;
