import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

import { apiRouter } from "./routes/index.ts";
import { webhookTestRouter } from "./routes/webhookTest.routes";
import { initRealtime } from "./realtime/io";
import { query } from "./db";

const app = express();

const isProd = process.env.NODE_ENV === "production";
const configuredOrigin = process.env.CORS_ORIGIN;
if (isProd && !configuredOrigin) {
  // Fail closed: avoids accidentally shipping with permissive/localhost CORS in production.
  throw new Error("Missing CORS_ORIGIN in production environment");
}
const corsOrigin = configuredOrigin ?? "http://localhost:3000";

app.set("trust proxy", 1); // important if behind proxy (railway/render/vercel). ok locally too.

app.use(helmet());

// limit JSON size (prevents huge payload spam)
app.use(express.json({ limit: "32kb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120, // 120 requests/min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});

app.use("/api", apiLimiter);

const apiSlowdown = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 60, // after 60 req/min start slowing down
  delayMs: () => 250, // +250ms per request over the limit
});

app.use("/api", apiSlowdown);

app.use(cookieParser());

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Local webhook receiver for testing
// - Enabled by default in dev
// - Disabled in production unless explicitly enabled
const enableWebhookTest = !isProd || ["1", "true", "yes"].includes(String(process.env.ENABLE_WEBHOOK_TEST ?? "").toLowerCase());
if (enableWebhookTest) {
  app.use("/webhook", webhookTestRouter);
}

// Your API routes
app.use("/api", apiRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ ok: false, error: "internal_error" });
});

const port = Number(process.env.PORT ?? 3001);

// HTTP server (needed for Socket.IO)
const server = http.createServer(app);

// Real-time chat
initRealtime(server);

// Best-effort: keep session tables from growing forever.
async function cleanupExpiredSessions() {
  await query("DELETE FROM customer_sessions WHERE expires_at < now()");
  await query("DELETE FROM store_sessions WHERE expires_at < now()");
}
cleanupExpiredSessions().catch((e) => console.error("session cleanup failed", e));

server.listen(port, () => console.log(`Backend running on http://localhost:${port}`));