import { Server } from "socket.io";
import type http from "http";
import crypto from "crypto";
import { query } from "../db.js";

// Singleton holder so routes can emit without import cycles.
let _io: Server | null = null;

type StoreUserCtx = {
  id: number;
  username: string;
  storeId: number;
  storeName: string;
  storeCity: string;
};

type CustomerCtx = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

const STORE_COOKIE = "store_session";
const CUSTOMER_COOKIE = "customer_session";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  // Very small cookie parser (avoids adding a dependency).
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(v);
  }
  return out;
}

async function getStoreUserFromToken(token: string): Promise<StoreUserCtx | null> {
  const tokenHash = sha256Hex(String(token));
  const rows = await query<(StoreUserCtx & { expires_at: string })>(
    `
    SELECT
      su.id,
      su.username,
      s.id as "storeId",
      s.name as "storeName",
      s.city as "storeCity",
      ss.expires_at
    FROM store_sessions ss
    JOIN store_users su ON su.id = ss.store_user_id
    JOIN stores s ON s.id = su.store_id
    WHERE ss.token_hash = $1
      AND ss.expires_at > now()
      AND su.active = true
    LIMIT 1
    `,
    [tokenHash]
  );
  return rows[0] ?? null;
}

async function getCustomerFromToken(token: string): Promise<CustomerCtx | null> {
  const tokenHash = sha256Hex(String(token));
  const rows = await query<CustomerCtx & { expires_at: string }>(
    `
    SELECT c.id, c.name, c.email, c.phone, s.expires_at
    FROM customer_sessions s
    JOIN customers c ON c.id = s.customer_id
    WHERE s.token_hash = $1
      AND s.expires_at > now()
    LIMIT 1
    `,
    [tokenHash]
  );
  return rows[0] ?? null;
}

export function initRealtime(server: http.Server) {
  if (_io) return _io;

  const origin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

  const io = new Server(server, {
    cors: { origin, credentials: true },
    // default path is /socket.io
  });

  io.use(async (socket, next) => {
    try {
      const cookies = parseCookieHeader(socket.request.headers.cookie);
      const storeToken = cookies[STORE_COOKIE];
      const customerToken = cookies[CUSTOMER_COOKIE];

      const storeUser = storeToken ? await getStoreUserFromToken(storeToken) : null;
      const customer = !storeUser && customerToken ? await getCustomerFromToken(customerToken) : null;

      if (!storeUser && !customer) {
        return next(new Error("not_authenticated"));
      }

      (socket.data as any).storeUser = storeUser;
      (socket.data as any).customer = customer;

      // Personal room so we can target a single user if needed.
      if (storeUser) {
        socket.join(`storeUser:${storeUser.id}`);
        // Store-wide room: lets us push inbox updates without joining every request room.
        socket.join(`store:${storeUser.storeId}`);
      }
      if (customer) socket.join(`customer:${customer.id}`);

      return next();
    } catch (e) {
      return next(new Error("auth_error"));
    }
  });

  io.on("connection", (socket) => {
    // Simple per-socket rate limiting to avoid DB flood.
    // (Not a replacement for API/IP limits, but helps protect hot paths.)
    const hit = (key: string, windowMs: number, max: number) => {
      const now = Date.now();
      const store = (((socket.data as any)._rl ??= {}) as Record<
        string,
        { count: number; resetAt: number }
      >);
      const cur = store[key];
      if (!cur || now > cur.resetAt) {
        store[key] = { count: 1, resetAt: now + windowMs };
        return true;
      }
      cur.count += 1;
      return cur.count <= max;
    };
    socket.emit("auth:ok", {
      ok: true,
      storeUser: (socket.data as any).storeUser ?? null,
      customer: (socket.data as any).customer ?? null,
    });

    socket.on("request:join", async (payload: any, ack?: (r: any) => void) => {
      try {
        if (!hit("request:join", 60_000, 120)) {
          return ack?.({ ok: false, error: "rate_limited" });
        }
        const storeUser = (socket.data as any).storeUser as StoreUserCtx | null;
        const customer = (socket.data as any).customer as CustomerCtx | null;

        const requestId = Number(payload?.requestId);
        const code = payload?.code ? String(payload.code).trim().toUpperCase() : "";

        // store joins by requestId
        if (storeUser) {
          if (!Number.isFinite(requestId)) return ack?.({ ok: false, error: "invalid_requestId" });
          const own = await query<{ id: number; status: string }>(
            `SELECT id, status FROM service_requests WHERE id=$1 AND store_id=$2 LIMIT 1`,
            [requestId, storeUser.storeId]
          );
          if (!own[0]) return ack?.({ ok: false, error: "not_found" });
          socket.join(`request:${requestId}`);
          return ack?.({ ok: true, requestId });
        }

        // customer joins by code (or requestId, but code is safer)
        if (customer) {
          if (!code) return ack?.({ ok: false, error: "code_required" });
          const own = await query<{ id: number; status: string }>(
            `SELECT id, status FROM service_requests WHERE customer_id=$1 AND code=$2 LIMIT 1`,
            [customer.id, code]
          );
          const r = own[0];
          if (!r) return ack?.({ ok: false, error: "not_found" });
          socket.join(`request:${r.id}`);
          return ack?.({ ok: true, requestId: r.id });
        }

        return ack?.({ ok: false, error: "not_authenticated" });
      } catch (e: any) {
        return ack?.({ ok: false, error: "server_error" });
      }
    });

    socket.on("request:leave", (payload: any, ack?: (r: any) => void) => {
      const requestId = Number(payload?.requestId);
      if (!Number.isFinite(requestId)) return ack?.({ ok: false, error: "invalid_requestId" });
      socket.leave(`request:${requestId}`);
      return ack?.({ ok: true });
    });

    socket.on("message:send", async (payload: any, ack?: (r: any) => void) => {
      try {
        if (!hit("message:send", 10_000, 12)) {
          return ack?.({ ok: false, error: "rate_limited" });
        }
        const storeUser = (socket.data as any).storeUser as StoreUserCtx | null;
        const customer = (socket.data as any).customer as CustomerCtx | null;

        const requestId = Number(payload?.requestId);
        const message = String(payload?.message ?? "").trim();
        if (!Number.isFinite(requestId)) return ack?.({ ok: false, error: "invalid_requestId" });
        if (!message) return ack?.({ ok: false, error: "message_required" });
        if (message.length > 1000) return ack?.({ ok: false, error: "message_too_long" });

        if (storeUser) {
          const own = await query<{ id: number; status: string }>(
            `SELECT id, status FROM service_requests WHERE id=$1 AND store_id=$2 LIMIT 1`,
            [requestId, storeUser.storeId]
          );
          const r = own[0];
          if (!r) return ack?.({ ok: false, error: "not_found" });
          if (r.status !== "in_progress" && r.status !== "done" && r.status !== "cancelled") {
            return ack?.({ ok: false, error: "chat_locked", status: r.status });
          }

          const inserted = await query<{ id: number }>(
            `INSERT INTO request_messages (request_id, sender_type, sender_id, message)
             VALUES ($1,'store',$2,$3)
             RETURNING id`,
            [requestId, storeUser.id, message]
          );

          const msg = await query<RealtimeMessage>(
            `SELECT id, request_id, sender_type, sender_id, message, created_at
             FROM request_messages WHERE id=$1 LIMIT 1`,
            [inserted[0].id]
          );

          emitMessage(msg[0]);
          return ack?.({ ok: true, message: msg[0] });
        }

        if (customer) {
          // customer is only allowed to message their own request.
          const own = await query<{ id: number; status: string; customer_messages_blocked: boolean | null }>(
            `
            SELECT id, status, customer_messages_blocked
            FROM service_requests
            WHERE id=$1 AND customer_id=$2
            LIMIT 1
            `,
            [requestId, customer.id]
          );
          const r = own[0];
          if (!r) return ack?.({ ok: false, error: "not_found" });
          if (r.status !== "in_progress" && r.status !== "done" && r.status !== "cancelled") {
            return ack?.({ ok: false, error: "chat_locked", status: r.status });
          }

          if (r.customer_messages_blocked) {
            return ack?.({ ok: false, error: "customer_messages_blocked" });
          }

          const inserted = await query<{ id: number }>(
            `INSERT INTO request_messages (request_id, sender_type, sender_id, message)
             VALUES ($1,'customer',$2,$3)
             RETURNING id`,
            [requestId, customer.id, message]
          );

          const msg = await query<RealtimeMessage>(
            `SELECT id, request_id, sender_type, sender_id, message, created_at
             FROM request_messages WHERE id=$1 LIMIT 1`,
            [inserted[0].id]
          );

          emitMessage(msg[0]);
          return ack?.({ ok: true, message: msg[0] });
        }

        return ack?.({ ok: false, error: "not_authenticated" });
      } catch (e: any) {
        return ack?.({ ok: false, error: "server_error" });
      }
    });
  });

  _io = io;
  return io;
}

export type RealtimeMessage = {
  id: number;
  request_id: number;
  sender_type: "store" | "customer" | string;
  sender_id: number | null;
  message: string;
  created_at: string;
};

export function getIO() {
  return _io;
}

export function emitMessage(msg: RealtimeMessage) {
  if (!_io) return;
  // Always emit to the request room (only sockets that explicitly joined it).
  _io.to(`request:${msg.request_id}`).emit("message:new", msg);

  // Also emit to store/customer rooms so inbox lists can update in real time.
  // Best-effort: if query fails, request room still works.
  query<{ store_id: number; customer_id: number }>(
    `SELECT store_id, customer_id FROM service_requests WHERE id = $1 LIMIT 1`,
    [msg.request_id]
  )
    .then((rows) => {
      const r = rows[0];
      if (!r) return;
      _io?.to(`store:${r.store_id}`).emit("message:new", msg);
      _io?.to(`customer:${r.customer_id}`).emit("message:new", msg);
    })
    .catch(() => null);
}
