import { Router } from "express";
import { query } from "../db/index.ts";
import { slugify } from "../utils/slugify.ts";
import { heavyReadLimiter } from "../middleware/antiSpam";

export const citiesRouter = Router();

type CityRow = { city: string };

citiesRouter.get("/", heavyReadLimiter, async (_req, res, next) => {
  try {
    const rows = await query<CityRow>(
      `SELECT DISTINCT city
       FROM stores
       WHERE city IS NOT NULL AND city <> ''
       ORDER BY city ASC`
    );

    const data = rows.map((r) => ({
      city: r.city,
      slug: slugify(r.city),
    }));

    res.json(data);
  } catch (e) {
    next(e);
  }
});
