import { Router } from "express";
import crypto from "crypto";
import { requireAdmin } from "../middleware/adminAuth";
import { query } from "../db";
import { hashPassword } from "../auth/storeAuth";

export const adminStoresRouter = Router();

/**
 * GET /admin/stores
 * List stores (includes integration status)
 */
adminStoresRouter.get("/", requireAdmin, async (_req, res) => {
  const stores = await query<{
    id: number;
    name: string;
    city: string;
    address: string;
    sync_enabled: boolean;
    sync_webhook_url: string | null;
  }>(`
    SELECT id, name, city, address, sync_enabled, sync_webhook_url
    FROM stores
    ORDER BY city, name
  `);

  res.json({ ok: true, stores });
});

/**
 * POST /admin/stores
 * Create store
 */
adminStoresRouter.post("/", requireAdmin, async (req, res) => {
  const { name, city, address } = (req.body ?? {}) as {
    name?: string;
    city?: string;
    address?: string;
  };

  if (!name || !city || !address) {
    return res.status(400).json({ ok: false, error: "name_city_address_required" });
  }

  const rows = await query<{ id: number }>(
    `
    INSERT INTO stores (name, city, address)
    VALUES ($1, $2, $3)
    RETURNING id
    `,
    [name.trim(), city.trim(), address.trim()]
  );

  res.json({ ok: true, id: rows[0]?.id });
});

/**
 * PUT /admin/stores/:id
 * Update store basic fields
 */
adminStoresRouter.put("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const { name, city, address } = (req.body ?? {}) as {
    name?: string;
    city?: string;
    address?: string;
  };

  if (!name || !city || !address) {
    return res.status(400).json({ ok: false, error: "name_city_address_required" });
  }

  await query(
    `
    UPDATE stores
    SET name = $1, city = $2, address = $3
    WHERE id = $4
    `,
    [name.trim(), city.trim(), address.trim(), id]
  );

  res.json({ ok: true });
});

/**
 * DELETE /admin/stores/:id
 * Delete store (may fail if FK constraints exist)
 */
adminStoresRouter.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  try {
    await query(`DELETE FROM stores WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch {
    res.status(400).json({
      ok: false,
      error: "delete_failed_has_dependencies",
    });
  }
});

/**
 * GET /admin/stores/:id/integration
 * Read integration config (webhook per store)
 */
adminStoresRouter.get("/:id/integration", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const rows = await query<{
    id: number;
    sync_enabled: boolean;
    sync_webhook_url: string | null;
    sync_hmac_secret: string | null;
  }>(
    `
    SELECT id, sync_enabled, sync_webhook_url, sync_hmac_secret
    FROM stores
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  const store = rows[0];
  if (!store) return res.status(404).json({ ok: false, error: "not_found" });

  res.json({ ok: true, store });
});

/**
 * PUT /admin/stores/:id/integration
 * Update integration config
 */
adminStoresRouter.put("/:id/integration", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const sync_enabled = Boolean((req.body ?? {}).sync_enabled);

  const sync_webhook_url_raw = (req.body ?? {}).sync_webhook_url as string | null | undefined;
  const sync_hmac_secret_raw = (req.body ?? {}).sync_hmac_secret as string | null | undefined;

  const sync_webhook_url =
    sync_webhook_url_raw === null || sync_webhook_url_raw === ""
      ? null
      : String(sync_webhook_url_raw ?? "").trim();

  const sync_hmac_secret =
    sync_hmac_secret_raw === null || sync_hmac_secret_raw === ""
      ? null
      : String(sync_hmac_secret_raw ?? "").trim();

  if (sync_enabled && (!sync_webhook_url || !sync_webhook_url.startsWith("http"))) {
    return res.status(400).json({ ok: false, error: "webhook_url_required" });
  }

  await query(
    `
    UPDATE stores
    SET sync_enabled = $1,
        sync_webhook_url = $2,
        sync_hmac_secret = $3
    WHERE id = $4
    `,
    [sync_enabled, sync_webhook_url, sync_hmac_secret, id]
  );

  res.json({ ok: true });
});

/**
 * POST /admin/stores/:id/integration/test
 * Sends a signed test payload to the store webhook.
 */
adminStoresRouter.post("/:id/integration/test", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const rows = await query<{
    name: string;
    sync_enabled: boolean;
    sync_webhook_url: string | null;
    sync_hmac_secret: string | null;
  }>(
    `
    SELECT name, sync_enabled, sync_webhook_url, sync_hmac_secret
    FROM stores
    WHERE id = $1
    LIMIT 1
    `,
    [id]
  );

  const cfg = rows[0];
  if (!cfg) return res.status(404).json({ ok: false, error: "not_found" });
  if (!cfg.sync_enabled) return res.status(400).json({ ok: false, error: "store_sync_disabled" });
  if (!cfg.sync_webhook_url) return res.status(400).json({ ok: false, error: "store_webhook_missing" });
  if (!cfg.sync_hmac_secret) return res.status(400).json({ ok: false, error: "store_secret_missing" });

  const payload = {
    event: "service_request.test",
    sentAt: new Date().toISOString(),
    store: { id, name: cfg.name },
    message: "TechFix webhook test",
  };

  const payloadStr = JSON.stringify(payload);
  const sig = crypto.createHmac("sha256", cfg.sync_hmac_secret).update(payloadStr).digest("hex");

  try {
    const resp = await fetch(cfg.sync_webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TechFix-Signature": sig,
      },
      body: payloadStr,
    });

    const text = await resp.text().catch(() => "");
    res.json({
      ok: true,
      httpStatus: resp.status,
      responseBody: text.slice(0, 1000),
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    res.status(502).json({ ok: false, error: "webhook_network_error", message });
  }
});

/**
 * POST /admin/stores/:id/store-user
 * Create a store login (employee) linked to a store
 * body: { username, password }
 */
adminStoresRouter.post("/:id/store-user", requireAdmin, async (req, res) => {
  const storeId = Number(req.params.id);
  if (!Number.isFinite(storeId)) return res.status(400).json({ ok: false, error: "invalid_store_id" });

  const username = String(req.body?.username ?? "").trim().toLowerCase();
  const password = String(req.body?.password ?? "");

  if (!username) return res.status(400).json({ ok: false, error: "username_required" });
  if (password.length < 6) return res.status(400).json({ ok: false, error: "password_too_short" });

  const passwordHash = await hashPassword(password);

  try {
    const rows = await query<{ id: number }>(
      `
      INSERT INTO store_users (store_id, username, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [storeId, username, passwordHash]
    );

    res.json({ ok: true, id: rows[0].id });
  } catch {
    res.status(400).json({ ok: false, error: "username_in_use" });
  }
});

/**
 * GET /admin/stores/:id/store-users
 * List store users for a store
 */
adminStoresRouter.get("/:id/store-users", requireAdmin, async (req, res) => {
  const storeId = Number(req.params.id);
  if (!Number.isFinite(storeId)) return res.status(400).json({ ok: false, error: "invalid_store_id" });

  const users = await query<{
    id: number;
    username: string;
    active: boolean;
    created_at: string;
  }>(
    `
    SELECT id, username, active, created_at
    FROM store_users
    WHERE store_id = $1
    ORDER BY created_at DESC
    `,
    [storeId]
  );

  res.json({ ok: true, users });
});

/**
 * PATCH /admin/stores/:storeId/store-users/:userId
 * Update store user:
 *  - active boolean (optional)
 *  - password string (optional, min 6)
 * If password changes, we delete store_sessions to force logout.
 */
adminStoresRouter.patch("/:storeId/store-users/:userId", requireAdmin, async (req, res) => {
  const storeId = Number(req.params.storeId);
  const userId = Number(req.params.userId);

  if (!Number.isFinite(storeId) || !Number.isFinite(userId)) {
    return res.status(400).json({ ok: false, error: "invalid_id" });
  }

  const nextActive = (req.body ?? {}).active;
  const newPassword = (req.body ?? {}).password ? String((req.body ?? {}).password) : null;

  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({ ok: false, error: "password_too_short" });
  }

  if (typeof nextActive !== "boolean" && !newPassword) {
    return res.status(400).json({ ok: false, error: "no_changes" });
  }

  const updates: string[] = [];
  const params: any[] = [];
  let p = 1;

  if (typeof nextActive === "boolean") {
    updates.push(`active = $${p++}`);
    params.push(nextActive);
  }

  if (newPassword) {
    const passwordHash = await hashPassword(newPassword);
    updates.push(`password_hash = $${p++}`);
    params.push(passwordHash);

    // force logout by deleting sessions for this user
    await query(`DELETE FROM store_sessions WHERE store_user_id = $1`, [userId]);
  }

  // WHERE id = $X AND store_id = $Y
  params.push(userId);
  params.push(storeId);

  const rows = await query<{ id: number }>(
    `
    UPDATE store_users
    SET ${updates.join(", ")}
    WHERE id = $${p++} AND store_id = $${p++}
    RETURNING id
    `,
    params
  );

  if (!rows[0]) return res.status(404).json({ ok: false, error: "not_found" });

  res.json({ ok: true });
});
