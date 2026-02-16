import { Router } from "express";
import { query } from "../db.js";
import { slugify } from "../utils/slugify.js";
import { heavyReadLimiter } from "../middleware/antiSpam.js";

export const brandsRouter = Router();

type BrandRow = { name: string };

brandsRouter.get("/", heavyReadLimiter, async (req, res, next) => {
  try {
    // City is optional: the project can run with a pre-defined city (MVP single-city launch).
    // If citySlug is not sent, we fall back to DEFAULT_CITY_NAME (slugified).
    const defaultCityName = String(process.env.DEFAULT_CITY_NAME ?? "").trim();
    const citySlug = String(req.query.citySlug ?? "").trim() || (defaultCityName ? slugify(defaultCityName) : "");
    if (!citySlug) return res.status(400).json({ error: "Missing query param: citySlug" });

    // Find the actual city name by matching slugify(city) = citySlug
    const cityRows = await query<{ city: string }>(
      `SELECT DISTINCT city FROM stores WHERE city IS NOT NULL AND city <> ''`
    );

    const cityMatch =
      cityRows.find((r) => slugify(r.city) === citySlug) ??
      (defaultCityName && slugify(defaultCityName) === citySlug ? { city: defaultCityName } : undefined);
    if (!cityMatch) {
      return res.status(404).json({ error: "City not found for citySlug", citySlug });
    }

    const brands = await query<BrandRow>(
      `
      SELECT DISTINCT b.name
      FROM stores s
      JOIN store_models sm ON sm.store_id = s.id
      JOIN models m ON m.id = sm.model_id
      JOIN brands b ON b.id = m.brand_id
      WHERE s.city = $1
      ORDER BY b.name ASC
      `,
      [cityMatch.city]
    );

    res.json(
      brands.map((b) => ({
        brand: b.name,
        slug: slugify(b.name),
      }))
    );
  } catch (e) {
    next(e);
  }
});
