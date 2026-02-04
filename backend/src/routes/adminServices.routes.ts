import { Router } from "express";
import { requireAdmin } from "../middleware/adminAuth";
import { query } from "../db.js";

export const adminServicesRouter = Router();

// List services
adminServicesRouter.get("/", requireAdmin, async (_req, res) => {
  const services = await query<{ id: number; name: string }>(
    `SELECT id, name FROM services ORDER BY name`
  );
  res.json({ ok: true, services });
});

// Create service
adminServicesRouter.post("/", requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) return res.status(400).json({ ok: false, error: "name is required" });

  try {
    const rows = await query<{ id: number }>(
      `INSERT INTO services (name) VALUES ($1) RETURNING id`,
      [name]
    );
    res.json({ ok: true, id: rows[0]?.id });
  } catch {
    // likely unique violation if you have unique(name)
    res.status(400).json({ ok: false, error: "Serviço já existe (nome duplicado)." });
  }
});

// Update service
adminServicesRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.name ?? "").trim();

  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });
  if (!name) return res.status(400).json({ ok: false, error: "name is required" });

  try {
    await query(`UPDATE services SET name = $1 WHERE id = $2`, [name, id]);
    res.json({ ok: true });
  } catch {
    res.status(400).json({ ok: false, error: "Não foi possível renomear (nome duplicado?)." });
  }
});

// Delete service
adminServicesRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "Invalid id" });

  try {
    await query(`DELETE FROM services WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(400).json({
      ok: false,
      error:
        "Não foi possível deletar. Esse serviço pode estar vinculado a preços. Remova os preços antes.",
    });
  }
});
