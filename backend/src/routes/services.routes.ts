import { Router } from "express";
import { query } from "../db.js";
import { slugify } from "../utils/slugify.ts";
import { heavyReadLimiter } from "../middleware/antiSpam";

export const servicesRouter = Router();

type CityRow = { city: string };

type ServiceAggRow = {
  service_id: number;
  service_name: string;
  min_price_cents: number;
  max_price_cents: number;
  store_count: number;
  currency: string;
};

servicesRouter.get("/", heavyReadLimiter, async (req, res, next) => {
  try {
    const defaultCityName = String(process.env.DEFAULT_CITY_NAME ?? "").trim();
    const citySlug = String(req.query.citySlug ?? "").trim() || (defaultCityName ? slugify(defaultCityName) : "");
    const modelIdRaw = String(req.query.modelId ?? "").trim();
    const modelId = Number(modelIdRaw);

    if (!citySlug) return res.status(400).json({ error: "Missing query param: citySlug" });
    if (!modelIdRaw || Number.isNaN(modelId)) {
      return res.status(400).json({ error: "Missing/invalid query param: modelId" });
    }

    // Match city by slug
    const cityRows = await query<CityRow>(
      `SELECT DISTINCT city FROM stores WHERE city IS NOT NULL AND city <> ''`
    );
    const cityMatch =
      cityRows.find((r) => slugify(r.city) === citySlug) ??
      (defaultCityName && slugify(defaultCityName) === citySlug ? { city: defaultCityName } : undefined);
    if (!cityMatch) return res.status(404).json({ error: "City not found", citySlug });

    // Services available for that city + model, aggregated across stores
    const rows = await query<ServiceAggRow>(
      `
      SELECT
        sv.id AS service_id,
        sv.name AS service_name,
        MIN(p.price_cents) AS min_price_cents,
        MAX(p.price_cents) AS max_price_cents,
        COUNT(DISTINCT p.store_id) AS store_count,
        MIN(p.currency) AS currency
      FROM store_model_service_prices p
      JOIN services sv ON sv.id = p.service_id
      JOIN stores s ON s.id = p.store_id
      WHERE TRIM(s.city) = TRIM($1)
        AND p.model_id = $2
      GROUP BY sv.id, sv.name
      ORDER BY sv.name ASC
      `,
      [cityMatch.city, modelId]
    );

    res.json(
      rows.map((r) => ({
        id: r.service_id,
        service: r.service_name,
        minPriceCents: Number(r.min_price_cents),
        maxPriceCents: Number(r.max_price_cents),
        storeCount: Number(r.store_count),
        currency: r.currency ?? "BRL",
      }))
    );
  } catch (e) {
    next(e);
  }
});
