import { Router } from "express";
import crypto from "crypto";
import { requireAdmin } from "../middleware/adminAuth.js";
import { query } from "../db.js";

export const adminRequestsRouter = Router();

/**
 * GET /admin/requests
 * Query:
 *  - storeId? number
 *  - status? string ('created' | 'in_progress' | 'done' | 'cancelled' | 'all')
 *  - q? string (code/email/name)
 *  - limit? number (default 50, max 200)
 *  - offset? number (default 0)
 */
adminRequestsRouter.get("/", requireAdmin, async (req, res) => {
  const storeIdRaw = req.query.storeId ? Number(req.query.storeId) : null;

  const statusRaw = req.query.status ? String(req.query.status).trim() : "all";
  const allowedStatuses = new Set(["created", "in_progress", "done", "cancelled", "all"]);
  const status = allowedStatuses.has(statusRaw) ? statusRaw : "all";

  const q = req.query.q ? String(req.query.q).trim() : "";
  if (q.length > 80) return res.status(400).json({ ok: false, error: "query_too_long" });

  const limitRaw = req.query.limit ? Number(req.query.limit) : 50;
  const offsetRaw = req.query.offset ? Number(req.query.offset) : 0;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
  const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

  const where: string[] = [];
  const params: any[] = [];
  let p = 1;

  if (storeIdRaw && Number.isFinite(storeIdRaw)) {
    where.push(`r.store_id = $${p++}`);
    params.push(storeIdRaw);
  }

  if (status !== "all") {
    where.push(`r.status = $${p++}`);
    params.push(status);
  }

  if (q.length > 0) {
    where.push(`(r.code ILIKE $${p} OR c.email ILIKE $${p} OR c.name ILIKE $${p})`);
    params.push(`%${q}%`);
    p++;
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = await query<{
    id: number;
    code: string;
    status: string;
    total_cents: number;
    currency: string;
    created_at: string;
    last_synced_at: string | null;

    // cancellation (API field names)
    cancelled_at: string | null;
    cancel_reason: string | null;
    cancelled_by_store_user_id: number | null;
    cancelled_by_username: string | null;

    store_id: number;
    store_name: string;
    store_city: string;

    model_name: string;

    customer_name: string;
    customer_email: string;
  }>(
    `
    SELECT
      r.id, r.code, r.status, r.total_cents, r.currency, r.created_at, r.last_synced_at,

      r.cancelled_at,
      r.cancelled_reason AS cancel_reason,
      r.cancelled_by_store_user_id,
      su.username AS cancelled_by_username,

      s.id as store_id, s.name as store_name, s.city as store_city,
      m.name as model_name,
      c.name as customer_name, c.email as customer_email
    FROM service_requests r
    JOIN stores s ON s.id = r.store_id
    JOIN models m ON m.id = r.model_id
    JOIN customers c ON c.id = r.customer_id
    LEFT JOIN store_users su ON su.id = r.cancelled_by_store_user_id
    ${whereSql}
    ORDER BY r.created_at DESC
    LIMIT $${p++} OFFSET $${p++}
    `,
    [...params, limit, offset]
  );

  const countRows = await query<{ count: string }>(
    `
    SELECT COUNT(*)::text as count
    FROM service_requests r
    JOIN customers c ON c.id = r.customer_id
    ${whereSql}
    `,
    params
  );

  res.json({
    ok: true,
    rows,
    total: Number(countRows[0]?.count ?? "0"),
    limit,
    offset,
  });
});

/**
 * GET /admin/requests/:id
 * header + items + sync logs + messages + read tracking + cancellation details
 */
adminRequestsRouter.get("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const headerRows = await query<{
    id: number;
    code: string;
    status: string;
    created_at: string;
    total_cents: number;
    currency: string;
    last_synced_at: string | null;

    cancelled_at: string | null;
    cancel_reason: string | null;
    cancelled_by_store_user_id: number | null;
    cancelled_by_username: string | null;

    store_id: number;
    store_name: string;
    store_city: string;
    store_address: string;

    model_id: number;
    model_name: string;

    customer_name: string;
    customer_email: string;
    customer_phone: string | null;

    customer_messages_blocked: boolean | null;
    customer_messages_blocked_at: string | null;
    customer_messages_blocked_by: string | null;
  }>(
    `
    SELECT
      r.id, r.code, r.status, r.created_at, r.total_cents, r.currency, r.last_synced_at,

      r.customer_messages_blocked,
      r.customer_messages_blocked_at,
      r.customer_messages_blocked_by,

      r.cancelled_at,
      r.cancelled_reason AS cancel_reason,
      r.cancelled_by_store_user_id,
      su.username AS cancelled_by_username,

      s.id as store_id, s.name as store_name, s.city as store_city, s.address as store_address,
      m.id as model_id, m.name as model_name,
      c.name as customer_name, c.email as customer_email, c.phone as customer_phone
    FROM service_requests r
    JOIN stores s ON s.id = r.store_id
    JOIN models m ON m.id = r.model_id
    JOIN customers c ON c.id = r.customer_id
    LEFT JOIN store_users su ON su.id = r.cancelled_by_store_user_id
    WHERE r.id = $1
    LIMIT 1
    `,
    [id]
  );

  const header = headerRows[0];
  if (!header) return res.status(404).json({ ok: false, error: "not_found" });

  const items = await query<{
    service_id: number;
    service_name: string;
    price_cents: number;
    currency: string;
    screen_option_id: number | null;
    screen_option_label: string | null;
  }>(
    `
    SELECT
      i.service_id,
      sv.name as service_name,
      i.price_cents,
      i.currency,
      i.screen_option_id,
      o.label as screen_option_label
    FROM service_request_items i
    JOIN services sv ON sv.id = i.service_id
    LEFT JOIN screen_options o ON o.id = i.screen_option_id
    WHERE i.request_id = $1
    ORDER BY sv.name
    `,
    [id]
  );

  const syncs = await query<{
    id: number;
    target: string;
    status: string;
    http_status: number | null;
    created_at: string;
  }>(
    `
    SELECT id, target, status, http_status, created_at
    FROM service_request_syncs
    WHERE request_id = $1
    ORDER BY created_at DESC
    LIMIT 30
    `,
    [id]
  );

  const messages = await query<{
    id: number;
    sender_type: string;
    sender_id: number | null;
    message: string;
    created_at: string;

    store_username: string | null;
    customer_name: string | null;
  }>(
    `
    SELECT
      rm.id,
      rm.sender_type,
      rm.sender_id,
      rm.message,
      rm.created_at,
      su.username AS store_username,
      c.name AS customer_name
    FROM request_messages rm
    LEFT JOIN store_users su
      ON rm.sender_type = 'store'
     AND su.id = rm.sender_id
    LEFT JOIN customers c
      ON rm.sender_type = 'customer'
     AND c.id = rm.sender_id
    WHERE rm.request_id = $1
    ORDER BY rm.created_at ASC
    LIMIT 400
    `,
    [id]
  );

  const reads = await query<{
    store_user_id: number;
    store_username: string;
    last_read_message_id: number;
    updated_at: string;
  }>(
    `
    SELECT
      rr.store_user_id,
      su.username AS store_username,
      rr.last_read_message_id,
      rr.updated_at
    FROM store_request_reads rr
    JOIN store_users su ON su.id = rr.store_user_id
    WHERE rr.request_id = $1
    ORDER BY rr.updated_at DESC
    LIMIT 50
    `,
    [id]
  );

  res.json({ ok: true, header, items, syncs, messages, reads });
});

/**
 * PATCH /admin/requests/:id/status
 * body: { status: 'created'|'in_progress'|'done'|'cancelled', reason?: string }
 */
adminRequestsRouter.patch("/:id/status", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const nextStatus = String(req.body?.status ?? "").trim();
  const allowed = new Set(["created", "in_progress", "done", "cancelled"]);
  if (!allowed.has(nextStatus)) return res.status(400).json({ ok: false, error: "invalid_status" });

  const reasonRaw = String(req.body?.reason ?? "").trim();
  if (reasonRaw.length > 1000) return res.status(400).json({ ok: false, error: "reason_too_long" });

  const own = await query<{ id: number; status: string }>(`SELECT id, status FROM service_requests WHERE id = $1 LIMIT 1`, [id]);
  if (!own[0]) return res.status(404).json({ ok: false, error: "not_found" });

  if (nextStatus === "cancelled") {
    await query(
      `
      UPDATE service_requests
      SET
        status = 'cancelled',
        cancelled_at = COALESCE(cancelled_at, now()),
        cancelled_reason = $2
      WHERE id = $1
      `,
      [id, reasonRaw || null]
    );
    return res.json({ ok: true });
  }

  await query(
    `
    UPDATE service_requests
    SET
      status = $2,
      cancelled_at = NULL,
      cancelled_reason = NULL,
      cancelled_by_store_user_id = NULL
    WHERE id = $1
    `,
    [id, nextStatus]
  );

  return res.json({ ok: true });
});

/**
 * PATCH /admin/requests/:id/customer-messages
 * body: { blocked: boolean }
 *
 * Admin-only toggle that prevents the CUSTOMER from sending new messages.
 * (Store can still message.)
 */
adminRequestsRouter.patch("/:id/customer-messages", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const blocked = Boolean(req.body?.blocked);

  const own = await query<{ id: number }>(`SELECT id FROM service_requests WHERE id = $1 LIMIT 1`, [id]);
  if (!own[0]) return res.status(404).json({ ok: false, error: "not_found" });

  const admin = (req as any).admin as { username?: string } | undefined;
  const username = String(admin?.username ?? "admin").slice(0, 80);

  if (blocked) {
    await query(
      `
      UPDATE service_requests
      SET
        customer_messages_blocked = TRUE,
        customer_messages_blocked_at = COALESCE(customer_messages_blocked_at, now()),
        customer_messages_blocked_by = $2
      WHERE id = $1
      `,
      [id, username]
    );
  } else {
    await query(
      `
      UPDATE service_requests
      SET
        customer_messages_blocked = FALSE,
        customer_messages_blocked_at = NULL,
        customer_messages_blocked_by = NULL
      WHERE id = $1
      `,
      [id]
    );
  }

  return res.json({ ok: true, blocked });
});

/**
 * POST /admin/requests/:id/sync
 * retry sync using store integration
 */
adminRequestsRouter.post("/:id/sync", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const headerRows = await query<{
    id: number;
    code: string;
    status: string;
    created_at: string;
    total_cents: number;
    currency: string;

    store_id: number;
    store_name: string;
    store_address: string;

    model_id: number;
    model_name: string;
  }>(
    `
    SELECT
      r.id, r.code, r.status, r.created_at, r.total_cents, r.currency,
      s.id as store_id, s.name as store_name, s.address as store_address,
      m.id as model_id, m.name as model_name
    FROM service_requests r
    JOIN stores s ON s.id = r.store_id
    JOIN models m ON m.id = r.model_id
    WHERE r.id = $1
    LIMIT 1
    `,
    [id]
  );

  const header = headerRows[0];
  if (!header) return res.status(404).json({ ok: false, error: "not_found" });

  const cfgRows = await query<{
    sync_enabled: boolean;
    sync_webhook_url: string | null;
    sync_hmac_secret: string | null;
  }>(
    `
    SELECT sync_enabled, sync_webhook_url, sync_hmac_secret
    FROM stores
    WHERE id = $1
    LIMIT 1
    `,
    [header.store_id]
  );

  const cfg = cfgRows[0];
  if (!cfg || !cfg.sync_enabled) return res.status(400).json({ ok: false, error: "store_sync_disabled" });
  if (!cfg.sync_webhook_url) return res.status(400).json({ ok: false, error: "store_webhook_missing" });
  if (!cfg.sync_hmac_secret) return res.status(400).json({ ok: false, error: "store_secret_missing" });

  const items = await query<{
    service_id: number;
    service_name: string;
    price_cents: number;
    currency: string;
    screen_option_id: number | null;
    screen_option_label: string | null;
  }>(
    `
    SELECT
      i.service_id,
      sv.name AS service_name,
      i.price_cents,
      i.currency,
      i.screen_option_id,
      o.label AS screen_option_label
    FROM service_request_items i
    JOIN services sv ON sv.id = i.service_id
    LEFT JOIN screen_options o ON o.id = i.screen_option_id
    WHERE i.request_id = $1
    ORDER BY sv.name
    `,
    [header.id]
  );

  const payload = {
    event: "service_request.sync",
    sentAt: new Date().toISOString(),
    request: {
      id: header.id,
      code: header.code,
      status: header.status,
      createdAt: header.created_at,
      totalCents: header.total_cents,
      currency: header.currency,
      store: { id: header.store_id, name: header.store_name, address: header.store_address },
      model: { id: header.model_id, name: header.model_name },
      services: items.map((it) => ({
        id: it.service_id,
        name: it.service_name,
        priceCents: it.price_cents,
        currency: it.currency,
      })),
    },
  };

  const payloadStr = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", cfg.sync_hmac_secret).update(payloadStr).digest("hex");

  try {
    const resp = await fetch(cfg.sync_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-TechFix-Signature": signature },
      body: payloadStr,
    });

    const text = await resp.text().catch(() => "");
    const status = resp.ok ? "success" : "error";

    await query(
      `INSERT INTO service_request_syncs (request_id, target, status, http_status, response_body)
       VALUES ($1, $2, $3, $4, $5)`,
      [header.id, cfg.sync_webhook_url, status, resp.status, text.slice(0, 5000)]
    );

    if (resp.ok) {
      await query(`UPDATE service_requests SET last_synced_at = now() WHERE id = $1`, [header.id]);
      return res.json({ ok: true });
    }

    return res.status(502).json({ ok: false, error: "webhook_failed", httpStatus: resp.status });
  } catch (e: any) {
    await query(
      `INSERT INTO service_request_syncs (request_id, target, status, http_status, response_body)
       VALUES ($1, $2, 'error', NULL, $3)`,
      [header.id, cfg.sync_webhook_url, String(e?.message ?? "unknown_error").slice(0, 5000)]
    );

    return res.status(502).json({ ok: false, error: "webhook_network_error" });
  }
});
