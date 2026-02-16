import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import { query } from "../db.js";

export const adminSecurityRouter = Router();

/**
 * POST /admin/security/logout-all-stores
 * Mata TODAS as sessões de store (store_sessions)
 */
adminSecurityRouter.post("/logout-all-stores", requireAdmin, async (_req, res) => {
  const rows = await query<{ count: string }>(`SELECT COUNT(*)::text as count FROM store_sessions`);
  const countBefore = Number(rows[0]?.count ?? 0);

  await query(`DELETE FROM store_sessions`);

  return res.json({ ok: true, cleared: countBefore });
});

/**
 * POST /admin/security/logout-store/:storeId
 * Mata sessões de UMA loja (opcional, mas útil)
 */
adminSecurityRouter.post("/logout-store/:storeId", requireAdmin, async (req, res) => {
  const storeId = Number(req.params.storeId);
  if (!Number.isFinite(storeId)) return res.status(400).json({ ok: false, error: "storeId_invalid" });

  const rows = await query<{ count: string }>(
    `
    SELECT COUNT(*)::text as count
    FROM store_sessions ss
    JOIN store_users su ON su.id = ss.store_user_id
    WHERE su.store_id = $1
    `,
    [storeId]
  );
  const countBefore = Number(rows[0]?.count ?? 0);

  await query(
    `
    DELETE FROM store_sessions ss
    USING store_users su
    WHERE su.id = ss.store_user_id
      AND su.store_id = $1
    `,
    [storeId]
  );

  return res.json({ ok: true, cleared: countBefore });
});
