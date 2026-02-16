import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth.js";
import { query } from "../db.js";

export const adminStoreModelsRouter = Router();

// Meta: stores + brands + models
adminStoreModelsRouter.get("/meta", requireAdmin, async (_req, res) => {
  const stores = await query<{ id: number; name: string; city: string }>(
    `SELECT id, name, city FROM stores ORDER BY city, name`
  );

  const brands = await query<{ id: number; name: string }>(
    `SELECT id, name FROM brands ORDER BY name`
  );

  const models = await query<{ id: number; name: string; brand_id: number }>(
    `SELECT id, name, brand_id FROM models ORDER BY name`
  );

  res.json({ ok: true, stores, brands, models });
});

// Get selected models for a store
adminStoreModelsRouter.get("/", requireAdmin, async (req, res) => {
  const storeId = Number(req.query.storeId);
  if (!Number.isFinite(storeId)) {
    return res.status(400).json({ ok: false, error: "storeId is required" });
  }

  const rows = await query<{ model_id: number }>(
    `SELECT model_id FROM store_models WHERE store_id = $1`,
    [storeId]
  );

  res.json({ ok: true, modelIds: rows.map((r) => r.model_id) });
});

// Replace selection for a store (sync)
adminStoreModelsRouter.post("/set", requireAdmin, async (req, res) => {
  const storeId = Number(req.body?.storeId);
  const modelIdsRaw = req.body?.modelIds;

  if (!Number.isFinite(storeId)) {
    return res.status(400).json({ ok: false, error: "storeId is required" });
  }
  if (!Array.isArray(modelIdsRaw)) {
    return res.status(400).json({ ok: false, error: "modelIds must be an array" });
  }

  const modelIds = modelIdsRaw
    .map((x: any) => Number(x))
    .filter((n: number) => Number.isFinite(n));

  // transaction-ish: delete then insert
  await query(`DELETE FROM store_models WHERE store_id = $1`, [storeId]);

  // insert selected (if any)
  for (const modelId of modelIds) {
    await query(
      `INSERT INTO store_models (store_id, model_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [storeId, modelId]
    );
  }

  res.json({ ok: true });
});
