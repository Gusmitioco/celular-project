import express from "express";
import cors from "cors";

import { loadEnv } from "./lib/env.js";

// Make sure .env is loaded regardless of where the process is started from.
loadEnv();

import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

const isProd = process.env.NODE_ENV === "production";
const configuredOrigin = process.env.CORS_ORIGIN;
if (isProd && !configuredOrigin) {
  throw new Error("Missing CORS_ORIGIN in production environment");
}

app.use(
  cors({
    origin: configuredOrigin ?? "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);
