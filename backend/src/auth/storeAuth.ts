import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";
import { query } from "../db.js";

// Reuse the same password hashing helpers you already use for customers.
// If your project has them in a different file, change this import path.
import { hashPassword, verifyPassword } from "./customerAuth";

const STORE_COOKIE = "store_session";
const SESSION_DAYS = 30;

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function setStoreSessionCookie(res: Response, storeUserId: number) {
  const token = makeToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  const isProd = process.env.NODE_ENV === "production";

  await query(
    `INSERT INTO store_sessions (store_user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [storeUserId, tokenHash, expiresAt.toISOString()]
  );

  res.cookie(STORE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    expires: expiresAt,
    // also set maxAge for compatibility
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export async function clearStoreSession(req: Request, res: Response) {
  const token = (req as any).cookies?.[STORE_COOKIE];
  if (token) {
    const tokenHash = sha256Hex(String(token));
    await query(`DELETE FROM store_sessions WHERE token_hash = $1`, [tokenHash]);
  }
  res.clearCookie(STORE_COOKIE, { path: "/" });
}

export type StoreUserCtx = {
  id: number;
  username: string;
  storeId: number;
  storeName: string;
  storeCity: string;
};

export async function requireStoreUser(req: Request, res: Response, next: NextFunction) {
  const token = (req as any).cookies?.[STORE_COOKIE];
  if (!token) return res.status(401).json({ ok: false, error: "not_authenticated" });

  const tokenHash = sha256Hex(String(token));

  const rows = await query<(StoreUserCtx & { expires_at: string })>(
    `
    SELECT
      su.id,
      su.username,
      s.id as "storeId",
      s.name as "storeName",
      s.city as "storeCity",
      ss.expires_at
    FROM store_sessions ss
    JOIN store_users su ON su.id = ss.store_user_id
    JOIN stores s ON s.id = su.store_id
    WHERE ss.token_hash = $1
      AND ss.expires_at > now()
      AND su.active = true
    LIMIT 1
    `,
    [tokenHash]
  );

  if (!rows[0]) return res.status(401).json({ ok: false, error: "not_authenticated" });

  (req as any).storeUser = rows[0];
  next();
}

// export hash helpers for admin store-user creation endpoints
export { hashPassword, verifyPassword };
