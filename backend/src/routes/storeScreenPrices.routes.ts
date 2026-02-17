import { Router } from "express";
import { query, pool } from "../db.js";
import { requireStoreUser } from "../auth/storeAuth.js";

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
// Returns all screen options for the model with current store price (0 = unavailable).
storeScreenPricesRouter.get("/", async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number };
  const modelId = Number(req.query.modelId);
  if (!Number.isFinite(modelId)) return res.status(400).json({ ok: false, error: "modelId_invalid" });

  const rows = await query<{
    screen_option_id: number;
    label: string;
    active: boolean;
    price_cents: number;
    last_price_cents: number;
    currency: string;
  }>(
    `
    SELECT
      o.id AS screen_option_id,
      o.label,
      o.active,
      COALESCE(sp.price_cents, 0) AS price_cents,
      COALESCE(sp.last_price_cents, 0) AS last_price_cents,
      COALESCE(sp.currency, 'BRL') AS currency
    FROM screen_options o
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
// body: { modelId, items: [{ screenOptionId, priceCents, available }] }
// Rules:
//  - available=false => price becomes 0 (unavailable)
//  - available=true  => priceCents must be > 0 (force user to set a price)
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

      const available = Boolean(it?.available);
      let priceCents = Number(it?.priceCents ?? 0);
      if (!Number.isFinite(priceCents) || priceCents < 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, error: "price_invalid" });
      }

      if (!available) {
        // Turn off -> price 0, but keep (or update) last_price_cents when a price was provided
        const last = priceCents > 0 ? priceCents : 0;
        await client.query(
          `
          INSERT INTO screen_option_prices_store (store_id, screen_option_id, price_cents, last_price_cents, currency)
          VALUES ($1, $2, 0, $3, 'BRL')
          ON CONFLICT (store_id, screen_option_id)
          DO UPDATE SET price_cents = 0,
                        last_price_cents = CASE
                          WHEN EXCLUDED.last_price_cents > 0 THEN EXCLUDED.last_price_cents
                          ELSE screen_option_prices_store.last_price_cents
                        END
          `,
          [storeUser.storeId, screenOptionId, last]
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
