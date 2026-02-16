// Bootstrap entrypoint.
//
// In ESM, static imports are evaluated before any top-level code in this file.
// We want to load .env files *before* importing the rest of the app (which
// reads process.env.DATABASE_URL in src/db/index.ts).

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

function tryLoadEnv(p: string) {
  if (!fs.existsSync(p)) return false;
  dotenv.config({ path: p, override: false });
  return true;
}

// Candidates, in priority order.
// Works whether you run from repo root or from ./backend.
const cwd = process.cwd();
const candidates = [
  path.resolve(cwd, ".env"),
  path.resolve(cwd, "backend", ".env"),
  path.resolve(cwd, "..", ".env"),
  path.resolve(cwd, "..", "..", ".env"),
];

for (const p of candidates) {
  if (tryLoadEnv(p)) break;
}

// Import the real server after env is loaded.
// - In dev (tsx), we can import the TS module.
// - In prod (compiled), we need to import the JS module.
try {
  await import("./serverMain.js");
} catch {
  await import("./serverMain.js");
}
