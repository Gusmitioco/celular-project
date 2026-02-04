import { Router } from "express";
import { requireStoreUser } from "../auth/storeAuth";
import { query } from "../db.js";
import { storeHeavyReadLimiter } from "../middleware/antiSpam";

export const storeInboxRouter = Router();

/**
 * GET /store/inbox?status=all|in_progress|done|cancelled&q=TFX-...&limit=200&offset=0
 *
 * Inbox rules:
 * - Only shows chats that are actually available:
 *   status IN ('in_progress','done','cancelled')
 * - Includes last message (if any) + unread_count (customer -> store)
 * - IMPORTANT: show the thread even if it has no messages yet
 */
storeInboxRouter.get("/", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  try {
    const storeUser = (req as any).storeUser as { storeId: number; id: number };
    const storeId = Number(storeUser?.storeId);
    const storeUserId = Number(storeUser?.id);

    if (!Number.isFinite(storeId) || !Number.isFinite(storeUserId)) {
      return res.status(401).json({ ok: false, error: "not_authenticated" });
    }

    const statusRaw = String(req.query.status ?? "all").trim();
    const allowed = new Set(["in_progress", "done", "cancelled", "all"]);
    const status = allowed.has(statusRaw) ? statusRaw : "all";

    const q = String(req.query.q ?? "").trim();
    if (q.length > 40) {
      return res.status(400).json({ ok: false, error: "query_too_long" });
    }

    const limitRaw = req.query.limit ? Number(req.query.limit) : 200;
    const offsetRaw = req.query.offset ? Number(req.query.offset) : 0;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 200;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const rows = await query<{
      id: number;
      code: string;
      status: string;
      created_at: string;
      total_cents: number;
      currency: string;
      customer_name: string;
      model_name: string;

      last_message_id: number | null;
      last_message_text: string | null;
      last_message_at: string | null;
      last_message_sender: string | null;

      unread_count: number;
    }>(
      `
      SELECT
        r.id,
        r.code,
        r.status,
        r.created_at,
        r.total_cents,
        r.currency,
        c.name AS customer_name,
        m.name AS model_name,

        lm.id AS last_message_id,
        lm.message AS last_message_text,
        lm.created_at AS last_message_at,
        lm.sender_type AS last_message_sender,

        COALESCE((
          SELECT COUNT(*)::int
          FROM request_messages rm
          LEFT JOIN store_request_reads rr
            ON rr.request_id = r.id
           AND rr.store_user_id = $2
          WHERE rm.request_id = r.id
            AND rm.sender_type = 'customer'
            AND rm.id > COALESCE(rr.last_read_message_id, 0)
        ), 0) AS unread_count

      FROM service_requests r
      JOIN customers c ON c.id = r.customer_id
      JOIN models m ON m.id = r.model_id

      -- last message per request
      LEFT JOIN LATERAL (
        SELECT id, message, created_at, sender_type
        FROM request_messages
        WHERE request_id = r.id
        ORDER BY id DESC
        LIMIT 1
      ) lm ON true

      WHERE r.store_id = $1

        -- ONLY chats that are available
        AND r.status IN ('in_progress','done','cancelled')

        -- status filter
        AND (
          $3 = 'all'
          OR r.status = $3
        )

        -- search by code OR customer name
        AND (
          $4 = ''
          OR r.code ILIKE ('%' || $4 || '%')
          OR c.name ILIKE ('%' || $4 || '%')
        )

      ORDER BY COALESCE(lm.created_at, r.created_at) DESC, r.id DESC
      LIMIT $5 OFFSET $6
      `,
      [storeId, storeUserId, status, q, limit, offset]
    );

    return res.json({ ok: true, rows, status, limit, offset, hasMore: rows.length === limit });
  } catch (e: any) {
    console.error("store inbox error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

/**
 * POST /store/inbox/:id/read
 * body: { lastReadMessageId: number }
 *
 * Marks messages as read (store-side) to compute unread badges.
 */
storeInboxRouter.post("/:id/read", requireStoreUser, storeHeavyReadLimiter, async (req, res) => {
  try {
    const storeUser = (req as any).storeUser as { storeId: number; id: number };
    const storeId = Number(storeUser?.storeId);
    const storeUserId = Number(storeUser?.id);

    if (!Number.isFinite(storeId) || !Number.isFinite(storeUserId)) {
      return res.status(401).json({ ok: false, error: "not_authenticated" });
    }

    const requestId = Number(req.params.id);
    if (!Number.isFinite(requestId)) return res.status(400).json({ ok: false, error: "invalid_id" });

    // Accept both names (UI historically used lastMessageId)
    const lastReadMessageId = Number(req.body?.lastReadMessageId ?? req.body?.lastMessageId ?? 0);
    if (!Number.isFinite(lastReadMessageId) || lastReadMessageId < 0) {
      return res.status(400).json({ ok: false, error: "invalid_lastReadMessageId" });
    }

    // ensure request belongs to this store
    const own = await query<{ id: number }>(
      `SELECT id FROM service_requests WHERE id = $1 AND store_id = $2 LIMIT 1`,
      [requestId, storeId]
    );
    if (!own[0]) return res.status(404).json({ ok: false, error: "not_found" });

    await query(
      `
      INSERT INTO store_request_reads (store_user_id, request_id, last_read_message_id, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (store_user_id, request_id)
      DO UPDATE SET
        last_read_message_id = GREATEST(store_request_reads.last_read_message_id, EXCLUDED.last_read_message_id),
        updated_at = now()
      `,
      [storeUserId, requestId, lastReadMessageId]
    );

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("store inbox read error:", e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});
