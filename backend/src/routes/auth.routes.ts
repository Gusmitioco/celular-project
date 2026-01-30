import { Router } from "express";
import { query } from "../db";
import {
  clearCustomerSession,
  hashPassword,
  requireCustomer,
  setCustomerSessionCookie,
  verifyPassword,
} from "../auth/customerAuth";
import { authLimiter, authSlowdown } from "../middleware/antiSpam";

export const authRouter = Router();

// Simple email format check (MVP)
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// MVP-friendly: >= 8, at least 1 letter + 1 number
function isStrongEnoughPassword(pw: string) {
  if (pw.length < 8) return false;
  const hasLetter = /[A-Za-z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  return hasLetter && hasNumber;
}

// small helpers to avoid absurd payloads
function safeStr(v: any, max = 200) {
  return String(v ?? "").trim().slice(0, max);
}

/**
 * POST /auth/register
 * body: { name, email, password, passwordConfirm, phone? }
 */
authRouter.post("/register", authLimiter, authSlowdown, async (req, res) => {
  const name = safeStr(req.body?.name, 80);
  const email = safeStr(req.body?.email, 160).toLowerCase();
  const phoneRaw = safeStr(req.body?.phone, 40);
  const phone = phoneRaw || null;

  const password = String(req.body?.password ?? "");
  const passwordConfirm = String(req.body?.passwordConfirm ?? "");

  if (!name) return res.status(400).json({ ok: false, error: "name_required" });

  if (!email) return res.status(400).json({ ok: false, error: "email_required" });
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: "email_invalid" });

  if (!password) return res.status(400).json({ ok: false, error: "password_required" });
  if (password.length < 8) return res.status(400).json({ ok: false, error: "password_too_short" });
  if (!isStrongEnoughPassword(password)) {
    return res.status(400).json({ ok: false, error: "password_weak" });
  }

  if (!passwordConfirm) return res.status(400).json({ ok: false, error: "password_confirm_required" });
  if (password !== passwordConfirm) return res.status(400).json({ ok: false, error: "password_mismatch" });

  const existing = await query<{ id: number }>(
    `SELECT id FROM customers WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (existing.length) return res.status(400).json({ ok: false, error: "email_in_use" });

  const passwordHash = await hashPassword(password);

  const rows = await query<{ id: number }>(
    `INSERT INTO customers (name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [name, email, phone, passwordHash]
  );

  await setCustomerSessionCookie(res, rows[0].id);
  res.json({ ok: true });
});

/**
 * POST /auth/login
 * body: { email, password }
 */
authRouter.post("/login", authLimiter, authSlowdown, async (req, res) => {
  const email = safeStr(req.body?.email, 160).toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!email) return res.status(400).json({ ok: false, error: "email_required" });
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: "email_invalid" });
  if (!password) return res.status(400).json({ ok: false, error: "password_required" });

  const rows = await query<{ id: number; password_hash: string }>(
    `SELECT id, password_hash FROM customers WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (!rows[0]) return res.status(400).json({ ok: false, error: "invalid_credentials" });

  const ok = await verifyPassword(password, rows[0].password_hash);
  if (!ok) return res.status(400).json({ ok: false, error: "invalid_credentials" });

  await setCustomerSessionCookie(res, rows[0].id);
  res.json({ ok: true });
});

/**
 * GET /auth/me
 */
authRouter.get("/me", requireCustomer, async (req, res) => {
  res.json({ ok: true, user: (req as any).customer });
});

/**
 * POST /auth/logout
 */
authRouter.post("/logout", async (req, res) => {
  await clearCustomerSession(req, res);
  res.json({ ok: true });
});
