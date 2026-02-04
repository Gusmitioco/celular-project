import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import { query } from "../db.js";

const COOKIE_NAME = "customer_session";

function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    // 30 dias
    // Express expects maxAge in milliseconds
    maxAge: 60 * 60 * 24 * 30 * 1000,
  };
}

export async function setCustomerSessionCookie(res: Response, customerId: number) {
  const token = makeToken();
  const tokenHash = sha256(token);

  // expira em 30 dias
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await query(
    `INSERT INTO customer_sessions (customer_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [customerId, tokenHash, expiresAt]
  );

  res.cookie(COOKIE_NAME, token, cookieOptions());
}

export async function clearCustomerSession(req: Request, res: Response) {
  const token = req.cookies?.[COOKIE_NAME];
  if (token) {
    const tokenHash = sha256(token);
    await query(`DELETE FROM customer_sessions WHERE token_hash = $1`, [tokenHash]);
  }
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function getCustomerFromRequest(req: Request) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;

  const tokenHash = sha256(token);

  const rows = await query<{
    id: number;
    name: string;
    email: string;
    phone: string | null;
  }>(
    `
    SELECT c.id, c.name, c.email, c.phone
    FROM customer_sessions s
    JOIN customers c ON c.id = s.customer_id
    WHERE s.token_hash = $1
      AND s.expires_at > now()
    LIMIT 1
    `,
    [tokenHash]
  );

  return rows[0] ?? null;
}

export async function requireCustomer(req: Request, res: Response, next: any) {
  const customer = await getCustomerFromRequest(req);
  if (!customer) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }
  (req as any).customer = customer;
  next();
}

// Optional customer session (guest allowed)
export async function optionalCustomer(req: Request, _res: Response, next: any) {
  const customer = await getCustomerFromRequest(req);
  if (customer) (req as any).customer = customer;
  next();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
