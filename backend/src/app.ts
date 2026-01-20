import express from "express";
import cors from "cors";

import { apiRouter } from "./routes/index.ts";
import { errorHandler } from "./middleware/errorHandler.ts";

export const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
  })
);

app.use(express.json());

app.use("/api", apiRouter);

app.use(errorHandler);
