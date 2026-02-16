import express from "express";
import http from "http";
import cors, { type CorsOptions } from "cors";
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
const isDev = !isProd;

function isWeakPassword(pw: string) {
  const s = (pw ?? "").trim();
  if (s.length < 10) return true;
  const lowered = s.toLowerCase();
  const common = new Set([
    "12345",
    "123456",
    "12345678",
    "password",
    "senha",
    "admin",
    "owner",
    "qwerty",
  ]);
  if (common.has(lowered)) return true;
  return false;
}

function validateProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;

  const adminPass = String(process.env.ADMIN_PASS ?? "");
  const adminSecret = String(process.env.ADMIN_JWT_SECRET ?? "");

  if (!adminPass || !adminSecret) {
    throw new Error("Missing ADMIN_PASS / ADMIN_JWT_SECRET in production environment");
  }

  if (isWeakPassword(adminPass)) {
    throw new Error("ADMIN_PASS is too weak for production (use a stronger password)");
  }

  // JWT secret should be long and random (32+ chars minimum).
  if (adminSecret.trim().length < 32) {
    throw new Error("ADMIN_JWT_SECRET is too short for production (use 32+ random chars)");
  }
}

validateProductionSecrets();


// --- CORS (must run BEFORE any limiter so preflight gets headers) ---
// In production we fail-closed unless CORS_ORIGIN is provided.
// In development we allow localhost/127.0.0.1/0.0.0.0 and private LAN IPs by default.
const configuredOriginRaw = (process.env.CORS_ORIGIN ?? "").trim();
if (isProd && !configuredOriginRaw) {
  throw new Error("Missing CORS_ORIGIN in production environment");
}

const configuredOrigins = configuredOriginRaw
  ? configuredOriginRaw.split(",").map((s) => s.trim()).filter(Boolean)
  : [];

function isAllowedDevOrigin(origin: string) {
  try {
    const u = new URL(origin);
    const host = u.hostname;

    // localhost-ish
    if (host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0") return true;

    // Private LAN ranges
    if (/^192\.168\./.test(host)) return true;
    if (/^10\./.test(host)) return true;

    // 172.16.0.0 – 172.31.255.255
    const m = host.match(/^172\.(\d+)\./);
    if (m) {
      const second = Number(m[1]);
      if (second >= 16 && second <= 31) return true;
    }

    return false;
  } catch {
    return false;
  }
}

const corsOptions: CorsOptions = {
  credentials: true,
  origin(origin, callback) {
    // Some tools / same-origin requests may not send Origin.
    if (!origin) return callback(null, true);

    // Prod: only allow explicitly configured origins
    if (isProd) {
      return callback(null, configuredOrigins.includes(origin));
    }

    // Dev:
    // If CORS_ORIGIN was set, we *still* want to allow private LAN origins so
    // mobile testing via http://<LAN-IP>:3000 works without constantly editing
    // environment variables.
    if (configuredOrigins.length > 0) {
      return callback(null, configuredOrigins.includes(origin) || isAllowedDevOrigin(origin));
    }

    return callback(null, isAllowedDevOrigin(origin));
  },
};

app.set("trust proxy", 1);

app.use(helmet());
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

// CORS + preflight
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// --- Rate limiting / slowdown (AFTER CORS) ---
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 600 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
  skip: (req) => {
    // Never limit preflight
    if (req.method === "OPTIONS") return true;

    // In dev, do not rate-limit auth endpoints to avoid dev lockouts.
    // NOTE: because the limiter is mounted at "/api", req.path will be like "/auth/...".
    // Use originalUrl for a stable prefix check.
    if (isDev && req.originalUrl.startsWith("/api/auth")) return true;

    return false;
  },
});

const apiSlowdown = slowDown({
  windowMs: 60 * 1000,
  delayAfter: isDev ? 300 : 60,
  delayMs: () => 250,
  skip: (req) => {
    if (req.method === "OPTIONS") return true;
    if (isDev && req.originalUrl.startsWith("/api/auth")) return true;
    return false;
  },
});

app.use("/api", apiLimiter);
app.use("/api", apiSlowdown);

// Local webhook receiver for testing
const enableWebhookTest =
  !isProd || ["1", "true", "yes"].includes(String(process.env.ENABLE_WEBHOOK_TEST ?? "").toLowerCase());
if (enableWebhookTest) {
  app.use("/webhook", webhookTestRouter);
}

// API routes
app.use("/api", apiRouter);

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ ok: false, error: "internal_error" });
});

const port = Number(process.env.PORT ?? 3001);
const server = http.createServer(app);

initRealtime(server);

async function cleanupExpiredSessions() {
  // Best-effort cleanup (ignore if tables don't exist)
  try {
    await query("DELETE FROM customer_sessions WHERE expires_at < now()");
  } catch {}
  try {
    await query("DELETE FROM store_sessions WHERE expires_at < now()");
  } catch {}
}
cleanupExpiredSessions().catch((e) => console.error("session cleanup failed", e));

server.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
