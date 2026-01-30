import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

type AdminTokenPayload = {
  sub: "owner";
  username: string;
};

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.admin_token;
    if (!token) return res.status(401).json({ ok: false, error: "Not authenticated" });

    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) return res.status(500).json({ ok: false, error: "Missing ADMIN_JWT_SECRET" });

    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    if (payload.sub !== "owner") return res.status(401).json({ ok: false, error: "Invalid token" });

    (req as any).admin = payload;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "Invalid or expired token" });
  }
}
