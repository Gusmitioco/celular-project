// Re-export DB helpers from a file path that works with Node ESM.
//
// This backend runs with "type": "module" (ESM).
// In Node ESM, importing a directory (e.g. "../db") does NOT resolve to "../db/index.js".
// Some routes were importing "../db" (or "../db/index.ts"), which breaks at runtime.
//
// Providing a real module file at "src/db.ts" lets routes import "../db.js" reliably.

export { pool, query } from "./db/index.js";
