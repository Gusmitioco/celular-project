import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";

/**
 * Anti-spam / anti-abuse middlewares (MVP)
 *
 * These limits are per-IP by default.
 * If you deploy behind a proxy (Vercel/Render/Railway), set:
 *   app.set("trust proxy", 1)
 * in server.ts so req.ip is correct.
 */

// ----------------------
// Customer / public site
// ----------------------

// Auth endpoints (customer login/register)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "too_many_attempts" },
});

export const authSlowdown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: () => 500, // +500ms per request after delayAfter
});

// Chat send (POST message) - customers
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});

// High-frequency reads (polling, lists) - customers/public
export const heavyReadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 180, // 180 req/min/IP (safe for polling every 5s)
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});

// Public request code lookup (GET /requests/public/:code)
// Stricter than heavyReadLimiter to reduce code-guessing / enumeration.
export const publicCodeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 req/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});

export const publicCodeSlowdown = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 10,
  delayMs: () => 250,
});

// Creating requests (checkout confirm)
export const createRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 create attempts / 10 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});

// ----------------------
// Store side (relaxed)
// ----------------------

// Store login is less likely to be attacked, and stores may share a NAT IP.
// Still protect brute-force, but with more relaxed limits.
export const storeAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120, // 120 attempts / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "too_many_attempts" },
});

export const storeAuthSlowdown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 15,
  delayMs: () => 250,
});

// Store chat: allow higher volume
export const storeChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120, // 120 messages/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});

// Store polling/inbox: allow higher volume too
export const storeHeavyReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600, // 600 req/min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "rate_limited" },
});
