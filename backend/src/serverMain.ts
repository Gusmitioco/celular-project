import express from "express";
import http from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

import { apiRouter } from "./routes/index.js";
import { webhookTestRouter } from "./routes/webhookTest.routes.js";
import { initRealtime } from "./realtime/io.js";
import { query } from "./db.js";

const app = express();

const isProd = process.env.NODE_ENV === "production";
const configuredOrigin = process.env.CORS_ORIGIN;
if (isProd && !configuredOrigin) {
  // Fail closed: avoids accidentally shipping with permissive/localhost CORS in production.
  throw new Error("Missing CORS_ORIGIN in production environment");
}
const corsOrigin = configuredOrigin ?? "http://localhost:3000";

function isAllowedDevOrigin(origin: string) {
  // Allow localhost and private LAN IPs (for testing on phone in the same Wi‑Fi)
  // Examples:
  // - http://localhost:3000
  // - http://127.0.0.1:3000
  // - http://192.168.0.10:3000
  // - http://10.0.0.5:3000
  // - http://172.16.0.8:3000
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
    || /^http:\/\/(10\.(?:\d{1,3}\.){2}\d{1,3})(:\d+)?$/i.test(origin)
    || /^http:\/\/(192\.168\.(?:\d{1,3}\.)\d{1,3})(:\d+)?$/i.test(origin)
    || /^http:\/\/(172\.(?:1[6-9]|2\d|3[0-1])\.(?:\d{1,3}\.)\d{1,3})(:\d+)?$/i.test(origin);
}


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
    origin: (origin, cb) => {
      // Some tools / iOS Safari can send no Origin header for same-origin navigations.
      if (!origin) return cb(null, true);

      // If user explicitly configured CORS_ORIGIN, respect it strictly.
      if (configuredOrigin) return cb(null, origin === configuredOrigin);

      // In dev, allow localhost and LAN IPs so phone on same Wi‑Fi can access.
      if (!isProd && isAllowedDevOrigin(origin)) return cb(null, true);

      return cb(new Error("Not allowed by CORS"));
    },
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

server.listen(port, "0.0.0.0", () => console.log(`Backend running on http://0.0.0.0:${port}`));