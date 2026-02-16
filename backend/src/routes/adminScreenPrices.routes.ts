import { Router } from "express";
import { pool, query } from "../db.js";
import { requireAdmin } from "../middleware/adminAuth.js";

// Admin can set screen option prices per store (similar to /admin/prices)
// price_cents = 0 => unavailable
// last_price_cents stores the last non-zero value to support a UI toggle

export const adminScreenPricesRouter = Router();

adminScreenPricesRouter.use(requireAdmin);

// GET /admin/screen-prices/meta
adminScreenPricesRouter.get("/meta", async (_req, res) => {
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

// GET /admin/screen-prices?storeId=...&modelId=...
// Returns all active+inactive options for the model and current store price (0 or null if missing)
adminScreenPricesRouter.get("/", async (req, res) => {
  const storeId = Number(req.query.storeId);
  const modelId = Number(req.query.modelId);
  if (!Number.isFinite(storeId) || !Number.isFinite(modelId)) {
    return res.status(400).json({ ok: false, error: "storeId and modelId are required" });
  }

  const rows = await query<{
    screen_option_id: number;
    label: string;
    active: boolean;
    price_cents: number;
    last_price_cents: number;
  }>(
    `
    SELECT
      o.id AS screen_option_id,
      o.label,
      o.active,
      COALESCE(sp.price_cents, 0) AS price_cents,
      COALESCE(sp.last_price_cents, 0) AS last_price_cents
    FROM screen_options o
    LEFT JOIN screen_option_prices_store sp
      ON sp.screen_option_id = o.id
     AND sp.store_id = $1
    WHERE o.model_id = $2
    ORDER BY o.active DESC, o.label ASC
    `,
    [storeId, modelId]
  );

  res.json({ ok: true, rows });
});

// POST /admin/screen-prices/bulk
// body: { storeId, modelId, items: [{ screenOptionId, priceCents, available }] }
// Rules:
//  - available=false => price becomes 0
//  - available=true  => priceCents must be > 0 (force user to set a price)
adminScreenPricesRouter.post("/bulk", async (req, res) => {
  const storeId = Number(req.body?.storeId);
  const modelId = Number(req.body?.modelId);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!Number.isFinite(storeId) || !Number.isFinite(modelId) || !Array.isArray(items)) {
    return res.status(400).json({ ok: false, error: "Invalid payload" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Ensure store supports model (optional but consistent with admin/prices)
    await client.query(
      `
      INSERT INTO store_models (store_id, model_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [storeId, modelId]
    );

    let updated = 0;
    for (const it of items) {
      const screenOptionId = Number(it?.screenOptionId);
      if (!Number.isFinite(screenOptionId)) continue;

      // Ensure option belongs to model
      const chk = await client.query(`SELECT 1 FROM screen_options WHERE id = $1 AND model_id = $2 LIMIT 1`, [
        screenOptionId,
        modelId,
      ]);
      if (!chk.rows[0]) continue;

      const available = Boolean(it?.available);
      let priceCents = Number(it?.priceCents ?? 0);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "price_invalid" });
      }

      if (!available) {
        // Turn off -> price 0, preserve last_price_cents as-is
        await client.query(
          `
          INSERT INTO screen_option_prices_store (store_id, screen_option_id, price_cents, last_price_cents, currency)
          VALUES ($1, $2, 0, 0, 'BRL')
          ON CONFLICT (store_id, screen_option_id)
          DO UPDATE SET price_cents = 0
          `,
          [storeId, screenOptionId]
        );
        updated++;
        continue;
      }

      // available=true => require price > 0
      if (priceCents <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "price_required" });
      }

      await client.query(
        `
        INSERT INTO screen_option_prices_store (store_id, screen_option_id, price_cents, last_price_cents, currency)
        VALUES ($1, $2, $3, $3, 'BRL')
        ON CONFLICT (store_id, screen_option_id)
        DO UPDATE SET price_cents = EXCLUDED.price_cents,
                      last_price_cents = EXCLUDED.last_price_cents,
                      currency = 'BRL'
        `,
        [storeId, screenOptionId, priceCents]
      );
      updated++;
    }

    await client.query("COMMIT");
    res.json({ ok: true, updated });
  } catch (_e) {
    await client.query("ROLLBACK");
    res.status(500).json({ ok: false, error: "bulk_update_failed" });
  } finally {
    client.release();
  }
});
