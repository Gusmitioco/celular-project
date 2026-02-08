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

type ScreenAggRow = {
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

    // Special case: "Troca de Tela" price depends on screen options.
    // If screen options exist for this model, return the MIN/MAX effective price across stores.
    const screenService = await query<{ id: number; name: string }>(
      `SELECT id, name FROM services WHERE name = 'Troca de Tela' LIMIT 1`
    );

    if (screenService[0]) {
      const agg = await query<ScreenAggRow>(
        `
        SELECT
          MIN(sp.price_cents) AS min_price_cents,
          MAX(sp.price_cents) AS max_price_cents,
          COUNT(DISTINCT s.id) AS store_count,
          MIN(COALESCE(sp.currency, 'BRL')) AS currency
        FROM screen_options o
        JOIN store_models sm ON sm.model_id = o.model_id
        JOIN stores s ON s.id = sm.store_id
        JOIN screen_option_prices_store sp
          ON sp.screen_option_id = o.id
         AND sp.store_id = s.id
        WHERE o.active = TRUE
          AND o.model_id = $1
          AND TRIM(s.city) = TRIM($2)
          AND sp.price_cents > 0
        `,
        [modelId, cityMatch.city]
      );

      const a = agg[0];
      if (a && Number(a.store_count ?? 0) > 0) {
        const sid = Number(screenService[0].id);
        const idx = rows.findIndex((r) => Number(r.service_id) === sid);

        const patched: ServiceAggRow = {
          service_id: sid,
          service_name: "Troca de Tela",
          min_price_cents: Number(a.min_price_cents ?? 0),
          max_price_cents: Number(a.max_price_cents ?? 0),
          store_count: Number(a.store_count ?? 0),
          currency: a.currency ?? "BRL",
        };

        if (idx >= 0) rows[idx] = patched;
        else rows.push(patched);
      }
    }

    // Special case: "Troca de Tela" uses screen options prices.
    // If screen options exist for this model, expose the service with a "from" price.
    const screenSvc = await query<{ id: number; name: string }>(
      `SELECT id, name FROM services WHERE name = 'Troca de Tela' LIMIT 1`
    );

    if (screenSvc[0]) {
      const agg = await query<ScreenAggRow>(
        `
        SELECT
          MIN(sp.price_cents) AS min_price_cents,
          MAX(sp.price_cents) AS max_price_cents,
          COUNT(DISTINCT s.id) AS store_count,
          MIN(COALESCE(sp.currency, 'BRL')) AS currency
        FROM screen_options o
        JOIN store_models sm ON sm.model_id = o.model_id
        JOIN stores s ON s.id = sm.store_id
        JOIN screen_option_prices_store sp
          ON sp.screen_option_id = o.id
         AND sp.store_id = s.id
        WHERE o.active = TRUE
          AND o.model_id = $1
          AND TRIM(s.city) = TRIM($2)
          AND sp.price_cents > 0
        `,
        [modelId, cityMatch.city]
      );

      const a = agg[0];
      if (a && Number(a.store_count ?? 0) > 0) {
        const sid = Number(screenSvc[0].id);
        const idx = rows.findIndex((r) => Number(r.service_id) === sid);
        const patched: ServiceAggRow = {
          service_id: sid,
          service_name: screenSvc[0].name,
          min_price_cents: Number(a.min_price_cents ?? 0),
          max_price_cents: Number(a.max_price_cents ?? 0),
          store_count: Number(a.store_count ?? 0),
          currency: a.currency ?? "BRL",
        };

        if (idx >= 0) rows[idx] = patched;
        else rows.push(patched);
      }
    }

    rows.sort((a, b) => String(a.service_name).localeCompare(String(b.service_name)));

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
