import { Router } from "express";
import { query } from "../db/index.ts";
import { slugify } from "../utils/slugify.ts";
import { heavyReadLimiter } from "../middleware/antiSpam";

export const modelsRouter = Router();

type CityRow = { city: string };
type BrandRow = { id: number; name: string };
type ModelRow = { id: number; name: string };

modelsRouter.get("/", heavyReadLimiter, async (req, res, next) => {
  try {
    const defaultCityName = String(process.env.DEFAULT_CITY_NAME ?? "").trim();
    const citySlug = String(req.query.citySlug ?? "").trim() || (defaultCityName ? slugify(defaultCityName) : "");
    const brandSlug = String(req.query.brandSlug ?? "").trim();

    if (!citySlug) return res.status(400).json({ error: "Missing query param: citySlug" });
    if (!brandSlug) return res.status(400).json({ error: "Missing query param: brandSlug" });

    // Match city by slug
    const cityRows = await query<CityRow>(
      `SELECT DISTINCT city FROM stores WHERE city IS NOT NULL AND city <> ''`
    );
    const cityMatch =
      cityRows.find((r) => slugify(r.city) === citySlug) ??
      (defaultCityName && slugify(defaultCityName) === citySlug ? { city: defaultCityName } : undefined);
    if (!cityMatch) return res.status(404).json({ error: "City not found", citySlug });

    // Match brand by slug
    const brandRows = await query<BrandRow>(`SELECT id, name FROM brands ORDER BY name ASC`);
    const brandMatch = brandRows.find((b) => slugify(b.name) === brandSlug);
    if (!brandMatch) return res.status(404).json({ error: "Brand not found", brandSlug });

    const models = await query<ModelRow>(
      `
      SELECT DISTINCT m.id, m.name
      FROM stores s
      JOIN store_models sm ON sm.store_id = s.id
      JOIN models m ON m.id = sm.model_id
      WHERE s.city = $1
        AND m.brand_id = $2
      ORDER BY m.name ASC
      `,
      [cityMatch.city, brandMatch.id]
    );

    res.json(
      models.map((m) => ({
        id: m.id,
        model: m.name,
      }))
    );
  } catch (e) {
    next(e);
  }
});
