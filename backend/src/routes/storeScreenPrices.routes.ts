import { Router } from "express";
import { query, pool } from "../db.js";
import { requireStoreUser } from "../auth/storeAuth";

export const storeScreenPricesRouter = Router();

storeScreenPricesRouter.use(requireStoreUser);

// GET /store/screen-prices/meta
storeScreenPricesRouter.get("/meta", async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number; storeName: string; storeCity: string };

  const store = { id: storeUser.storeId, name: storeUser.storeName, city: storeUser.storeCity };
  const brands = await query<{ id: number; name: string }>(`SELECT id, name FROM brands ORDER BY name ASC`);
  const models = await query<{ id: number; name: string; brand_id: number }>(
    `SELECT id, name, brand_id FROM models ORDER BY name ASC`
  );

  return res.json({ ok: true, store, brands, models });
});

// GET /store/screen-prices?modelId=...
// Returns all screen options for the model with admin price + current store override (nullable).
storeScreenPricesRouter.get("/", async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number };
  const modelId = Number(req.query.modelId);
  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });

  const rows = await query<{
    screen_option_id: number;
    label: string;
    active: boolean;
    admin_price_cents: number;
    store_price_cents: number | null;
    currency: string;
  }>(
    `
    SELECT
      o.id AS screen_option_id,
      o.label,
      o.active,
      ap.price_cents AS admin_price_cents,
      sp.price_cents AS store_price_cents,
      COALESCE(sp.currency, ap.currency) AS currency
    FROM screen_options o
    JOIN screen_option_prices_admin ap ON ap.screen_option_id = o.id
    LEFT JOIN screen_option_prices_store sp
      ON sp.screen_option_id = o.id
     AND sp.store_id = $1
    WHERE o.model_id = $2
    ORDER BY o.active DESC, o.label ASC
    `,
    [storeUser.storeId, modelId]
  );

  return res.json({ ok: true, rows });
});

// POST /store/screen-prices/bulk
// body: { modelId, items: [{ screenOptionId, priceCents|null }] }
// If priceCents is null, deletes the override (falls back to admin price).
storeScreenPricesRouter.post("/bulk", async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number };
  const modelId = Number(req.body?.modelId);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
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

      const priceCentsRaw = it?.priceCents;
      if (priceCentsRaw == null) {
        await client.query(
          `DELETE FROM screen_option_prices_store WHERE store_id = $1 AND screen_option_id = $2`,
          [storeUser.storeId, screenOptionId]
        );
        updated++;
        continue;
      }

      const priceCents = Number(priceCentsRaw);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "price_invalid" });
      }

      await client.query(
        `
        INSERT INTO screen_option_prices_store (store_id, screen_option_id, price_cents, currency)
        VALUES ($1, $2, $3, 'BRL')
        ON CONFLICT (store_id, screen_option_id)
        DO UPDATE SET price_cents = EXCLUDED.price_cents, currency = 'BRL'
        `,
        [storeUser.storeId, screenOptionId, priceCents]
      );
      updated++;
    }

    await client.query("COMMIT");
    return res.json({ ok: true, updated });
  } catch (_e: any) {
    await client.query("ROLLBACK");
    return res.status(500).json({ ok: false, error: "bulk_update_failed" });
  } finally {
    client.release();
  }
});
