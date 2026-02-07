import { Router } from "express";
import { query } from "../db.js";
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

// Keep only digits, limit to 11 (BR: DDD + 8/9 digits). Returns null if empty.
function normalizePhoneDigits(v: any): string | null {
  const digits = String(v ?? "")
    .replace(/\D+/g, "")
    .slice(0, 11);
  return digits ? digits : null;
}

function isValidBRPhoneDigits(digits: string) {
  return /^[0-9]{10,11}$/.test(digits);
}

/**
 * POST /auth/register
 * body: { name, email, password, passwordConfirm, phone? }
 */
authRouter.post("/register", authLimiter, authSlowdown, async (req, res) => {
  const name = safeStr(req.body?.name, 80);
  const email = safeStr(req.body?.email, 160).toLowerCase();
  const phone = normalizePhoneDigits(req.body?.phone);

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

  if (phone && !isValidBRPhoneDigits(phone)) {
    return res.status(400).json({ ok: false, error: "phone_invalid" });
  }

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
 * PUT /auth/me
 * body: { name?, phone? }
 *
 * MVP: allow editing basic profile fields (name/phone).
 * Email + password changes are intentionally left for a future step.
 */
authRouter.put("/me", requireCustomer, async (req, res) => {
  const customer = (req as any).customer as { id: number; name: string; email: string; phone: string | null };

  const body = (req.body ?? {}) as any;
  const hasName = Object.prototype.hasOwnProperty.call(body, "name");
  const hasPhone = Object.prototype.hasOwnProperty.call(body, "phone");

  const name = safeStr(req.body?.name, 80);
  const phone = hasPhone ? normalizePhoneDigits(req.body?.phone) : customer.phone;

  if (hasPhone && phone && !isValidBRPhoneDigits(phone)) {
    return res.status(400).json({ ok: false, error: "phone_invalid" });
  }

  // Require at least one field to change
  if (!hasName && !hasPhone) {
    return res.status(400).json({ ok: false, error: "no_fields" });
  }

  // Name is optional, but if present it must not be empty.
  if (hasName && !name) {
    return res.status(400).json({ ok: false, error: "name_required" });
  }

  const rows = await query<{ id: number; name: string; email: string; phone: string | null }>(
    `UPDATE customers
     SET
       name = COALESCE(NULLIF($1, ''), name),
       phone = $2
     WHERE id = $3
     RETURNING id, name, email, phone`,
    [name, phone, customer.id]
  );

  res.json({ ok: true, user: rows[0] ?? customer });
});

/**
 * PUT /auth/password
 * body: { currentPassword, newPassword, newPasswordConfirm? }
 */
authRouter.put("/password", requireCustomer, async (req, res) => {
  const customer = (req as any).customer as { id: number };

  const currentPassword = String(req.body?.currentPassword ?? "");
  const newPassword = String(req.body?.newPassword ?? "");
  const newPasswordConfirm = String(req.body?.newPasswordConfirm ?? "");

  if (!currentPassword) {
    return res.status(400).json({ ok: false, error: "current_password_required" });
  }
  if (!newPassword) {
    return res.status(400).json({ ok: false, error: "new_password_required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ ok: false, error: "password_too_short" });
  }
  if (!isStrongEnoughPassword(newPassword)) {
    return res.status(400).json({ ok: false, error: "password_weak" });
  }
  if (!newPasswordConfirm) {
    return res.status(400).json({ ok: false, error: "password_confirm_required" });
  }
  if (newPassword !== newPasswordConfirm) {
    return res.status(400).json({ ok: false, error: "password_mismatch" });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ ok: false, error: "password_same" });
  }

  const rows = await query<{ password_hash: string }>(
    `SELECT password_hash FROM customers WHERE id = $1 LIMIT 1`,
    [customer.id]
  );
  if (!rows[0]) {
    return res.status(404).json({ ok: false, error: "not_found" });
  }

  const ok = await verifyPassword(currentPassword, rows[0].password_hash);
  if (!ok) {
    return res.status(400).json({ ok: false, error: "invalid_current_password" });
  }

  const passwordHash = await hashPassword(newPassword);
  await query(`UPDATE customers SET password_hash = $1 WHERE id = $2`, [passwordHash, customer.id]);

  res.json({ ok: true });
});

/**
 * POST /auth/logout
 */
authRouter.post("/logout", async (req, res) => {
  await clearCustomerSession(req, res);
  res.json({ ok: true });
});
