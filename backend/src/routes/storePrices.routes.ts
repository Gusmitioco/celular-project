import { Router } from "express";
import { requireStoreUser } from "../auth/storeAuth";
import { pool, query } from "../db.js";

export const storePricesRouter = Router();

/**
 * GET /store/prices/meta
 * Returns the store user context + catalogs needed for the prices screen.
 */
storePricesRouter.get("/meta", requireStoreUser, async (req, res) => {
  const storeUser = (req as any).storeUser;

  const brands = await query<{ id: number; name: string }>(
    `SELECT id, name FROM brands ORDER BY name`
  );

  const models = await query<{ id: number; name: string; brand_id: number }>(
    `SELECT id, name, brand_id FROM models ORDER BY name`
  );

  const services = await query<{ id: number; name: string }>(
    `SELECT id, name FROM services ORDER BY name`
  );

  res.json({
    ok: true,
    store: {
      id: storeUser.storeId,
      name: storeUser.storeName,
      city: storeUser.storeCity,
    },
    brands,
    models,
    services,
  });
});

/**
 * GET /store/prices?modelId=123
 * Returns prices for ALL services for the logged-in store + selected model.
 */
storePricesRouter.get("/", requireStoreUser, async (req, res) => {
  const storeUser = (req as any).storeUser;
  const storeId = Number(storeUser?.storeId);
  const modelId = Number(req.query.modelId);

  if (!Number.isFinite(modelId)) {
    return res.status(400).json({ ok: false, error: "modelId is required" });
  }

  const rows = await query<{
    service_id: number;
    service_name: string;
    price_cents: number | null;
    currency: string | null;
  }>(
    `
    SELECT
      sv.id as service_id,
      sv.name as service_name,
      p.price_cents,
      p.currency
    FROM services sv
    LEFT JOIN store_model_service_prices p
      ON p.service_id = sv.id
     AND p.store_id = $1
     AND p.model_id = $2
    ORDER BY sv.name
    `,
    [storeId, modelId]
  );

  res.json({ ok: true, rows });
});

/**
 * POST /store/prices/bulk
 * body: { modelId, items: [{ serviceId, priceCents, currency }], currency }
 *
 * StoreId always comes from the authenticated store session.
 */
storePricesRouter.post("/bulk", requireStoreUser, async (req, res) => {
  const storeUser = (req as any).storeUser;
  const storeId = Number(storeUser?.storeId);

  const { modelId, items, currency } = req.body ?? {};
  const mId = Number(modelId);
  const cur = (currency ?? "BRL") as string;

  if (!Number.isFinite(storeId) || !Number.isFinite(mId) || !Array.isArray(items)) {
    return res.status(400).json({ ok: false, error: "Invalid payload" });
  }

  const normalized = items
    .map((it: any) => ({
      serviceId: Number(it?.serviceId),
      priceCents: Number(it?.priceCents),
      currency: (it?.currency ?? cur) as string,
    }))
    .filter((it: any) => it.serviceId != null);

  if (
    normalized.length === 0 ||
    !normalized.every((it: any) => Number.isFinite(it.serviceId) && Number.isFinite(it.priceCents) && it.priceCents >= 0)
  ) {
    return res.status(400).json({ ok: false, error: "Invalid items" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Ensure store supports model (optional but recommended)
    await client.query(
      `
      INSERT INTO store_models (store_id, model_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [storeId, mId]
    );

    for (const it of normalized) {
      await client.query(
        `
        INSERT INTO store_model_service_prices (store_id, model_id, service_id, price_cents, currency)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (store_id, model_id, service_id)
        DO UPDATE SET price_cents = EXCLUDED.price_cents, currency = EXCLUDED.currency
        `,
        [storeId, mId, it.serviceId, it.priceCents, it.currency]
      );
    }

    await client.query("COMMIT");
    res.json({ ok: true, updated: normalized.length });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ ok: false, error: "Erro ao salvar em lote" });
  } finally {
    client.release();
  }
});
