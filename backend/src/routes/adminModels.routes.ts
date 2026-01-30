import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { query } from "../db";

export const adminModelsRouter = Router();

// List models (with brand info)
adminModelsRouter.get("/", requireAdmin, async (_req, res) => {
  const models = await query<{
    id: number;
    name: string;
    brand_id: number;
    brand_name: string;
  }>(
    `
    SELECT m.id, m.name, m.brand_id, b.name as brand_name
    FROM models m
    JOIN brands b ON b.id = m.brand_id
    ORDER BY b.name, m.name
    `
  );

  const brands = await query<{ id: number; name: string }>(
    `SELECT id, name FROM brands ORDER BY name`
  );

  res.json({ ok: true, brands, models });
});

// Create model
adminModelsRouter.post("/", requireAdmin, async (req, res) => {
  const brandId = Number(req.body?.brandId);
  const name = String(req.body?.name ?? "").trim();

  if (!Number.isFinite(brandId)) {
    return res.status(400).json({ ok: false, error: "brandId is required" });
  }
  if (!name) {
    return res.status(400).json({ ok: false, error: "name is required" });
  }

  try {
    const rows = await query<{ id: number }>(
      `INSERT INTO models (brand_id, name) VALUES ($1, $2) RETURNING id`,
      [brandId, name]
    );
    res.json({ ok: true, id: rows[0]?.id });
  } catch {
    res.status(400).json({ ok: false, error: "Modelo já existe para essa marca (duplicado)." });
  }
});

// Update model
adminModelsRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const brandId = Number(req.body?.brandId);
  const name = String(req.body?.name ?? "").trim();

  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
  if (!Number.isFinite(brandId)) return res.status(400).json({ ok: false, error: "brandId is required" });
  if (!name) return res.status(400).json({ ok: false, error: "name is required" });

  try {
    await query(`UPDATE models SET brand_id = $1, name = $2 WHERE id = $3`, [brandId, name, id]);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ ok: false, error: "Não foi possível salvar (duplicado?)." });
  }
});

// Delete model
adminModelsRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    await query(`DELETE FROM models WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(400).json({
      ok: false,
      error:
        "Não foi possível deletar. Esse modelo pode estar vinculado a lojas/preços. Remova vínculos antes.",
    });
  }
});
