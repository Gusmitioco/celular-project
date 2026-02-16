import { Router } from "express";
import jwt from "jsonwebtoken";
import { requireAdmin } from "../middleware/adminAuth.js";

export const adminAuthRouter = Router();

adminAuthRouter.post("/login", (req, res) => {
  const username = String(req.body?.username ?? "").trim().slice(0, 120);
  const password = String(req.body?.password ?? "");

  const ADMIN_USER = process.env.ADMIN_USER ?? "owner";
  const ADMIN_PASS = process.env.ADMIN_PASS ?? "";
  const secret = process.env.ADMIN_JWT_SECRET ?? "";

  if (!ADMIN_PASS || !secret) {
    return res.status(500).json({ ok: false, error: "Server admin auth not configured" });
  }

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const token = jwt.sign({ sub: "owner", username: ADMIN_USER }, secret, { expiresIn: "7d" });

  const isProd = process.env.NODE_ENV === "production";

  // httpOnly cookie so JS can’t read it
  res.cookie("admin_token", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ ok: true });
});

adminAuthRouter.post("/logout", (_req, res) => {
  res.clearCookie("admin_token", { path: "/" });
  res.json({ ok: true });
});

adminAuthRouter.get("/me", requireAdmin, (req, res) => {
  const admin = (req as any).admin as { username: string };
  res.json({ ok: true, user: { role: "owner", username: admin.username } });
});
