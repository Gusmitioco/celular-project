import { Router } from "express";
import { query, pool } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth";

export const adminScreenOptionsRouter = Router();

adminScreenOptionsRouter.use(requireAdmin);

// GET /admin/screen-options/meta
// Returns brands + models for the selector UI.
adminScreenOptionsRouter.get("/meta", async (_req, res) => {
  const brands = await query<{ id: number; name: string }>(
    `SELECT id, name FROM brands ORDER BY name ASC`
  );
  const models = await query<{ id: number; name: string; brand_id: number }>(
    `SELECT id, name, brand_id FROM models ORDER BY name ASC`
  );
  return res.json({ ok: true, brands, models });
});

// GET /admin/screen-options?modelId=...
adminScreenOptionsRouter.get("/", async (req, res) => {
  const modelId = Number(req.query.modelId);
  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });

  const rows = await query<{
    id: number;
    label: string;
    active: boolean;
  }>(
    `
    SELECT
      o.id,
      o.label,
      o.active,
    FROM screen_options o
    WHERE o.model_id = $1
    ORDER BY o.active DESC, o.label ASC
    `,
    [modelId]
  );

  return res.json({ ok: true, rows });
});

// POST /admin/screen-options
// body: { modelId, label, active? }
adminScreenOptionsRouter.post("/", async (req, res) => {
  const modelId = Number(req.body?.modelId);
  const label = String(req.body?.label ?? "").trim();
  const active = req.body?.active == null ? true : Boolean(req.body?.active);

  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });
  if (!label) return res.status(400).json({ ok: false, error: "label_required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query<{ id: number }>(
      `INSERT INTO screen_options (model_id, label, active)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [modelId, label, active]
    );
    const id = Number(ins.rows[0]?.id);
    await client.query("COMMIT");
    return res.json({ ok: true, id });
  } catch (e: any) {
    await client.query("ROLLBACK");
    // unique (model_id, label)
    if (String(e?.code) === "23505") {
      return res.status(400).json({ ok: false, error: "duplicate_label" });
    }
    return res.status(500).json({ ok: false, error: "create_failed" });
  } finally {
    client.release();
  }
});

// POST /admin/screen-options/bulk
// body: { modelId, items: [{ id, label, active }] }
adminScreenOptionsRouter.post("/bulk", async (req, res) => {
  const modelId = Number(req.body?.modelId);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let updated = 0;

    for (const it of items) {
      const id = Number(it?.id);
      if (!Number.isFinite(id)) continue;

      const label = String(it?.label ?? "").trim();
      const active = it?.active == null ? undefined : Boolean(it?.active);

      if (label) {
        await client.query(
          `UPDATE screen_options SET label = $1 WHERE id = $2 AND model_id = $3`,
          [label, id, modelId]
        );
      }
      if (active !== undefined) {
        await client.query(
          `UPDATE screen_options SET active = $1 WHERE id = $2 AND model_id = $3`,
          [active, id, modelId]
        );
      }

      updated++;
    }

    await client.query("COMMIT");
    return res.json({ ok: true, updated });
  } catch (e: any) {
    await client.query("ROLLBACK");
    if (String(e?.code) === "23505") {
      return res.status(400).json({ ok: false, error: "duplicate_label" });
    }
    return res.status(500).json({ ok: false, error: "bulk_update_failed" });
  } finally {
    client.release();
  }
});

// DELETE /admin/screen-options/:id  (soft delete)
adminScreenOptionsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "id_invalid" });

  await query(`UPDATE screen_options SET active = FALSE WHERE id = $1`, [id]);
  return res.json({ ok: true });
});
