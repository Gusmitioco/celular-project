import { Router } from "express";
import { query } from "../db/index.ts";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "techfix-backend" });
});

apiRouter.get("/db-test", async (_req, res, next) => {
  try {
    const rows = await query<{ now: string }>("select now() as now");
    res.json({ ok: true, now: rows[0]?.now });
  } catch (e) {
    next(e);
  }
});
