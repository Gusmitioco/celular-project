import { Router } from "express";
import { query } from "../db.js";
import { slugify } from "../utils/slugify.ts";
import { heavyReadLimiter } from "../middleware/antiSpam";

export const screenOptionsRouter = Router();

type CityRow = { city: string };

type OptionRow = {
  id: number;
  label: string;
  min_price_cents: number;
  max_price_cents: number;
  store_count: number;
  currency: string;
};

// GET /screen-options/public?modelId=...&citySlug=...
// Returns active screen options for the model, with min/max effective price across stores in the city.
screenOptionsRouter.get("/public", heavyReadLimiter, async (req, res, next) => {
  try {
    const defaultCityName = String(process.env.DEFAULT_CITY_NAME ?? "").trim();
    const citySlug = String(req.query.citySlug ?? "").trim() || (defaultCityName ? slugify(defaultCityName) : "");
    const modelIdRaw = String(req.query.modelId ?? "").trim();
    const modelId = Number(modelIdRaw);

    if (!citySlug) return res.status(400).json({ ok: false, error: "citySlug_required" });
    if (!modelIdRaw || Number.isNaN(modelId)) {
      return res.status(400).json({ ok: false, error: "modelId_invalid" });
    }

    // Match city by slug
    const cityRows = await query<CityRow>(
      `SELECT DISTINCT city FROM stores WHERE city IS NOT NULL AND city <> ''`
    );
    const cityMatch =
      cityRows.find((r) => slugify(r.city) === citySlug) ??
      (defaultCityName && slugify(defaultCityName) === citySlug ? { city: defaultCityName } : undefined);
    if (!cityMatch) return res.status(404).json({ ok: false, error: "city_not_found", citySlug });

    // Effective price per store = COALESCE(store_override, admin_price)
    // Then we aggregate MIN/MAX across stores in the city that cover that model.
    const rows = await query<OptionRow>(
      `
      SELECT
        o.id,
        o.label,
        MIN(COALESCE(sp.price_cents, ap.price_cents)) AS min_price_cents,
        MAX(COALESCE(sp.price_cents, ap.price_cents)) AS max_price_cents,
        COUNT(DISTINCT s.id) AS store_count,
        MIN(COALESCE(sp.currency, ap.currency)) AS currency
      FROM screen_options o
      JOIN screen_option_prices_admin ap ON ap.screen_option_id = o.id
      JOIN store_models sm ON sm.model_id = o.model_id
      JOIN stores s ON s.id = sm.store_id
      LEFT JOIN screen_option_prices_store sp
        ON sp.screen_option_id = o.id
       AND sp.store_id = s.id
      WHERE o.active = TRUE
        AND o.model_id = $1
        AND TRIM(s.city) = TRIM($2)
      GROUP BY o.id, o.label
      ORDER BY o.label ASC
      `,
      [modelId, cityMatch.city]
    );

    return res.json({
      ok: true,
      rows: rows.map((r) => ({
        id: Number(r.id),
        label: r.label,
        minPriceCents: Number(r.min_price_cents ?? 0),
        maxPriceCents: Number(r.max_price_cents ?? 0),
        storeCount: Number(r.store_count ?? 0),
        currency: r.currency ?? "BRL",
      })),
    });
  } catch (e) {
    next(e);
  }
});
