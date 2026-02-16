import { Router } from "express";
import { query } from "../db.js";
import { clearStoreSession, requireStoreUser, setStoreSessionCookie, verifyPassword } from "../auth/storeAuth.js";
import { storeAuthLimiter, storeAuthSlowdown } from "../middleware/antiSpam.js";

export const storeAuthRouter = Router();

/**
 * POST /store-auth/login
 * body: { username, password }
 */
storeAuthRouter.post("/login", storeAuthLimiter, storeAuthSlowdown, async (req, res) => {
  const username = String(req.body?.username ?? "").trim().toLowerCase().slice(0, 120);
  const password = String(req.body?.password ?? "");

  if (!username) return res.status(400).json({ ok: false, error: "username_required" });
  if (!password) return res.status(400).json({ ok: false, error: "password_required" });

  const rows = await query<{ id: number; password_hash: string; active: boolean }>(
    `SELECT id, password_hash, active FROM store_users WHERE username = $1 LIMIT 1`,
    [username]
  );

  if (!rows[0] || !rows[0].active) {
    return res.status(400).json({ ok: false, error: "invalid_credentials" });
  }

  const ok = await verifyPassword(password, rows[0].password_hash);
  if (!ok) return res.status(400).json({ ok: false, error: "invalid_credentials" });

  await setStoreSessionCookie(res, rows[0].id);
  res.json({ ok: true });
});

/**
 * GET /store-auth/me
 */
storeAuthRouter.get("/me", requireStoreUser, async (req, res) => {
  res.json({ ok: true, user: (req as any).storeUser });
});

/**
 * POST /store-auth/logout
 */
storeAuthRouter.post("/logout", async (req, res) => {
  await clearStoreSession(req, res);
  res.json({ ok: true });
});
