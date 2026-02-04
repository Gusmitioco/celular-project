// ESM-friendly entrypoint for db access.
// This avoids Node ESM directory-resolution issues ("./db" -> "./db/index.js").
export { pool, query } from "./db/index.js";
