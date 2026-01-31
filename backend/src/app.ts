import express from "express";
import cors from "cors";

import { loadEnv } from "./lib/env.ts";

// Make sure .env is loaded regardless of where the process is started from.
loadEnv();

import { apiRouter } from "./routes/index.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);
