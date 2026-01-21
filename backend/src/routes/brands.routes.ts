import { Router } from "express";
import { query } from "../db/index.ts";
import { slugify } from "../utils/slugify.ts";

export const brandsRouter = Router();

type BrandRow = { name: string };

brandsRouter.get("/", async (req, res, next) => {
  try {
    const citySlug = String(req.query.citySlug ?? "").trim();
    if (!citySlug) {
      return res.status(400).json({ error: "Missing query param: citySlug" });
    }

    // Find the actual city name by matching slugify(city) = citySlug
    const cityRows = await query<{ city: string }>(
      `SELECT DISTINCT city FROM stores WHERE city IS NOT NULL AND city <> ''`
    );

    const cityMatch = cityRows.find((r) => slugify(r.city) === citySlug);
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
