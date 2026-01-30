import { Router } from "express";
import { query } from "../db/index.ts";
import { slugify } from "../utils/slugify.ts";
import { heavyReadLimiter } from "../middleware/antiSpam";

export const storesRouter = Router();

type CityRow = { city: string };

type StoreTotalRow = {
  store_id: number;
  store_name: string;
  city: string;
  address: string;
  total_cents: number;
  currency: string;
};

function parseServiceIds(input: unknown, max = 10): number[] {
  // serviceIds can be "1,2,3" or repeated params (?serviceIds=1&serviceIds=2)
  const rawParts: string[] = Array.isArray(input)
    ? input.flatMap((x) => String(x).split(","))
    : String(input ?? "").split(",");

  const nums = rawParts
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n));

  // dedupe + keep stable order
  const uniq: number[] = [];
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) continue;
    seen.add(n);
    uniq.push(n);
    if (uniq.length >= max) break;
  }
  return uniq;
}

storesRouter.get("/", heavyReadLimiter, async (req, res, next) => {
  try {
    const citySlug = String(req.query.citySlug ?? "").trim();
    const modelIdRaw = String(req.query.modelId ?? "").trim();
    const modelId = Number(modelIdRaw);

    const serviceIds = parseServiceIds(req.query.serviceIds, 10);

    if (!citySlug) return res.status(400).json({ error: "Missing query param: citySlug" });
    if (!modelIdRaw || Number.isNaN(modelId)) {
      return res.status(400).json({ error: "Missing/invalid query param: modelId" });
    }
    if (serviceIds.length === 0) {
      return res.status(400).json({ error: "Missing/invalid query param: serviceIds (e.g. 1,2)" });
    }
    // If you want a strict hard error (instead of silently truncating), use this:
    // if (rawCount > 10) return res.status(400).json({ error: "Too many serviceIds (max 10)" });

    // Match city by slug
    const cityRows = await query<CityRow>(
      `SELECT DISTINCT city FROM stores WHERE city IS NOT NULL AND city <> ''`
    );
    const cityMatch = cityRows.find((r) => slugify(r.city) === citySlug);
    if (!cityMatch) return res.status(404).json({ error: "City not found", citySlug });

    const rows = await query<StoreTotalRow>(
      `
      SELECT
        s.id AS store_id,
        s.name AS store_name,
        s.city,
        s.address,
        SUM(p.price_cents)::int AS total_cents,
        MIN(p.currency) AS currency
      FROM store_model_service_prices p
      JOIN stores s ON s.id = p.store_id
      WHERE TRIM(s.city) = TRIM($1)
        AND p.model_id = $2
        AND p.service_id = ANY($3::bigint[])
      GROUP BY s.id, s.name, s.city, s.address
      HAVING COUNT(DISTINCT p.service_id) = $4
      ORDER BY total_cents ASC, s.name ASC
      `,
      [cityMatch.city, modelId, serviceIds, serviceIds.length]
    );

    res.json(
      rows.map((r) => ({
        id: r.store_id,
        name: r.store_name,
        city: r.city,
        address: r.address,
        totalCents: Number(r.total_cents),
        currency: r.currency ?? "BRL",
      }))
    );
  } catch (e) {
    next(e);
  }
});
