import { Router } from "express";
import { query } from "../db.js";
import { requireStoreUser } from "../auth/storeAuth.js";
import { storeChatLimiter, storeHeavyReadLimiter } from "../middleware/antiSpam.js";
import { emitMessage, type RealtimeMessage } from "../realtime/io.js";

export const storeRequestsRouter = Router();

/**
 * NEW PLAN:
 * - Stores should NOT browse "created" requests (too much spam / they won't have every code).
 * - Store can only move "created" -> "in_progress" by typing the CODE (accept-by-code).
 * - From "in_progress", store can move to "done" OR "cancelled" (with reason).
 * - Store can NOT move anything back to "created".
 * - Chat works when request is in_progress, done, or cancelled.
 */

/**
 * GET /store/requests
 * Query:
 *  - status=in_progress|done|cancelled|all (default: in_progress)
 *  - q=TFX... (filters by code)
 * Returns latest 100
 */
storeRequestsRouter.get("/", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number; id: number };

  const statusRaw = String(req.query.status ?? "in_progress").trim();
  const qRaw = String(req.query.q ?? "").trim();
  if (qRaw.length > 40) return res.status(400).json({ ok: false, error: "query_too_long" });

  // created is intentionally NOT allowed in listing (new plan)
  const allowedStatuses = new Set(["in_progress", "done", "cancelled", "all"]);
  const status = allowedStatuses.has(statusRaw) ? statusRaw : "in_progress";
  const q = qRaw.toUpperCase();

  const where: string[] = [`r.store_id = $1`];
  const params: any[] = [storeUser.storeId];
  let p = 2;

  if (status !== "all") {
    where.push(`r.status = $${p++}`);
    params.push(status);
  } else {
    // all = only in_progress + done + cancelled (no created)
    where.push(`r.status IN ('in_progress','done','cancelled')`);
  }

  if (q) {
    where.push(`r.code ILIKE $${p++}`);
    params.push(`%${q}%`);
  }

  const rows = await query<{
    id: number;
    code: string;
    status: string;
    created_at: string;
    total_cents: number;
    currency: string;
    model_name: string;
    customer_name: string;
  }>(
    `
    SELECT
      r.id, r.code, r.status, r.created_at, r.total_cents, r.currency,
      m.name as model_name,
      c.name as customer_name
    FROM service_requests r
    JOIN models m ON m.id = r.model_id
    JOIN customers c ON c.id = r.customer_id
    WHERE ${where.join(" AND ")}
    ORDER BY r.created_at DESC
    LIMIT 100
    `,
    params
  );

  const countsRows = await query<{ status: string; count: number }>(
    `
    SELECT status, COUNT(*)::int as count
    FROM service_requests
    WHERE store_id = $1
      AND status IN ('in_progress','done','cancelled')
    GROUP BY status
    `,
    [storeUser.storeId]
  );

  const counts: Record<string, number> = { created: 0, in_progress: 0, done: 0, cancelled: 0 };
  for (const r of countsRows) {
    if (r.status in counts) counts[r.status] = Number(r.count);
  }

  res.json({ ok: true, rows, counts });
});

/**
 * POST /store/requests/accept
 * body: { code: string }
 *
 * Accepts a request BY CODE:
 * - must belong to this store
 * - must currently be status='created'
 * - updates to 'in_progress'
 * - sets in_progress_at
 */
storeRequestsRouter.post("/accept", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number };

  const code = String(req.body?.code ?? "").trim().toUpperCase();
  if (!code) return res.status(400).json({ ok: false, error: "code_required" });
  if (code.length > 40) return res.status(400).json({ ok: false, error: "code_too_long" });

  const rows = await query<{ id: number }>(
    `
    UPDATE service_requests
    SET
      status = 'in_progress',
      in_progress_at = COALESCE(in_progress_at, NOW())
    WHERE code = $1
      AND store_id = $2
      AND status = 'created'
    RETURNING id
    `,
    [code, storeUser.storeId]
  );

  if (!rows[0]) {
    // not found / other store / already moved / etc (generic to avoid leaks)
    return res.status(404).json({ ok: false, error: "not_found_or_not_creatable" });
  }

  res.json({ ok: true, id: Number(rows[0].id) });
});

/**
 * GET /store/requests/lookup?code=TFX-....
 * Only returns if request belongs to logged-in store.
 *
 * NOTE: lookup is allowed, but does NOT change status.
 */
storeRequestsRouter.get("/lookup", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number };

  const code = String(req.query.code ?? "").trim().toUpperCase();
  if (code.length > 40) return res.status(400).json({ ok: false, error: "code_too_long" });
  if (!code) return res.status(400).json({ ok: false, error: "code_required" });

  const headerRows = await query<{
    id: number;
    code: string;
    status: string;
    created_at: string;
    total_cents: number;
    currency: string;

    in_progress_at: string | null;
    done_at: string | null;
    cancelled_at: string | null;
    cancelled_reason: string | null;

    store_id: number;
    store_name: string;
    store_city: string;
    store_address: string;

    model_id: number;
    model_name: string;

    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
  }>(
    `
    SELECT
      r.id, r.code, r.status, r.created_at, r.total_cents, r.currency,
      r.in_progress_at, r.done_at, r.cancelled_at, r.cancelled_reason,
      s.id as store_id, s.name as store_name, s.city as store_city, s.address as store_address,
      m.id as model_id, m.name as model_name,
      c.name as customer_name, c.email as customer_email, c.phone as customer_phone
    FROM service_requests r
    JOIN stores s ON s.id = r.store_id
    JOIN models m ON m.id = r.model_id
    JOIN customers c ON c.id = r.customer_id
    WHERE r.code = $1
      AND r.store_id = $2
    LIMIT 1
    `,
    [code, storeUser.storeId]
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
    [header.id]
  );

  res.json({ ok: true, header, items });
});

/**
 * PATCH /store/requests/:id/status
 * body: { status: "done" }
 *
 * Rules:
 * - created -> in_progress must be done via /accept by code (not here)
 * - in_progress -> done allowed (sets done_at)
 * - NO status back to "created"
 */
storeRequestsRouter.patch("/:id/status", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number };

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const nextStatus = String(req.body?.status ?? "").trim();
  const allowedNext = new Set(["done"]);
  if (!allowedNext.has(nextStatus)) return res.status(400).json({ ok: false, error: "invalid_status" });

  const rows = await query<{ id: number }>(
    `
    UPDATE service_requests
    SET
      status = 'done',
      done_at = COALESCE(done_at, NOW())
    WHERE id = $1
      AND store_id = $2
      AND status = 'in_progress'
    RETURNING id
    `,
    [id, storeUser.storeId]
  );

  if (!rows[0]) return res.status(400).json({ ok: false, error: "invalid_transition_or_not_found" });

  res.json({ ok: true });
});

/**
 * POST /store/requests/:id/cancel
 * body: { reason: string }
 *
 * Rules:
 * - only in_progress -> cancelled
 * - stores may send blank reason, but we still store it (empty string)
 */
storeRequestsRouter.post("/:id/cancel", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number; id: number };
  const storeId = Number(storeUser?.storeId);
  const storeUserId = Number(storeUser?.id);

  if (!Number.isFinite(storeId) || !Number.isFinite(storeUserId)) {
    return res.status(401).json({ ok: false, error: "not_authenticated" });
  }

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  // allow blank, but keep max length
  const reason = String(req.body?.reason ?? "").trim();
  if (reason.length > 1000) return res.status(400).json({ ok: false, error: "reason_too_long" });

  const rows = await query<{ id: number }>(
    `
    UPDATE service_requests
    SET
      status = 'cancelled',
      cancelled_at = COALESCE(cancelled_at, NOW()),
      cancelled_reason = $1,
      cancelled_by_store_user_id = $2
    WHERE id = $3
      AND store_id = $4
      AND status = 'in_progress'
    RETURNING id
    `,
    // store blank as "" (not NULL)
    [reason, storeUserId, id, storeId]
  );

  if (!rows[0]) return res.status(400).json({ ok: false, error: "invalid_transition_or_not_found" });

  return res.json({ ok: true });
});

/**
 * GET /store/requests/:id/messages
 * Chat available when status is in_progress, done, or cancelled
 */
storeRequestsRouter.get("/:id/messages", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number };

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const own = await query<{ id: number; status: string }>(
    `SELECT id, status FROM service_requests WHERE id = $1 AND store_id = $2 LIMIT 1`,
    [id, storeUser.storeId]
  );
  const r = own[0];
  if (!r) return res.status(404).json({ ok: false, error: "not_found" });

  if (r.status !== "in_progress" && r.status !== "done" && r.status !== "cancelled") {
    return res.status(403).json({ ok: false, error: "chat_locked", status: r.status });
  }

  const rows = await query<{
    id: number;
    sender_type: string;
    sender_id: number | null;
    message: string;
    created_at: string;
  }>(
    `
    SELECT id, sender_type, sender_id, message, created_at
    FROM request_messages
    WHERE request_id = $1
    ORDER BY created_at ASC
    LIMIT 200
    `,
    [id]
  );

  res.json({ ok: true, rows });
});

/**
 * POST /store/requests/:id/messages
 * body: { message: string }
 * Chat available when status is in_progress, done, or cancelled
 */
storeRequestsRouter.post("/:id/messages", requireStoreUser, storeChatLimiter, async (req, res) => {
  const storeUser = (req as any).storeUser as { storeId: number; id: number };

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ ok: false, error: "invalid_id" });

  const message = String(req.body?.message ?? "").trim();
  if (!message) return res.status(400).json({ ok: false, error: "message_required" });
  if (message.length > 1000) return res.status(400).json({ ok: false, error: "message_too_long" });

  const own = await query<{ id: number; status: string }>(
    `SELECT id, status FROM service_requests WHERE id = $1 AND store_id = $2 LIMIT 1`,
    [id, storeUser.storeId]
  );
  const r = own[0];
  if (!r) return res.status(404).json({ ok: false, error: "not_found" });

  if (r.status !== "in_progress" && r.status !== "done" && r.status !== "cancelled") {
    return res.status(403).json({ ok: false, error: "chat_locked", status: r.status });
  }

  const inserted = await query<{ id: number }>(
    `
    INSERT INTO request_messages (request_id, sender_type, sender_id, message)
    VALUES ($1, 'store', $2, $3)
    RETURNING id
    `,
    [id, storeUser.id, message]
  );

  // Emit realtime event (best-effort)
  const msg = await query<RealtimeMessage>(
    `
    SELECT id, request_id, sender_type, sender_id, message, created_at
    FROM request_messages
    WHERE id = $1
    LIMIT 1
    `,
    [inserted[0].id]
  );
  if (msg[0]) emitMessage(msg[0]);

  res.json({ ok: true, id: inserted[0].id });
});
