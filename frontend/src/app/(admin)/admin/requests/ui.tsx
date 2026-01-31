"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatBRLFromCents } from "../../../../lib/format";
import { apiBaseUrl } from "@/services/api";

type Store = { id: number; name: string; city: string };

type Row = {
  id: number;
  code: string;
  status: "created" | "in_progress" | "done" | "cancelled";
  total_cents: number;
  currency: string;
  created_at: string;
  last_synced_at: string | null;

  // NEW (optional if backend not updated yet)
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  cancelled_by_username?: string | null;

  store_id: number;
  store_name: string;
  store_city: string;
  model_name: string;
  customer_name: string;
  customer_email: string;
};

type ListResp = {
  ok: true;
  rows: Row[];
  total: number;
  limit: number;
  offset: number;
};

function statusLabel(s: Row["status"]) {
  if (s === "created") return "Criado";
  if (s === "in_progress") return "Em andamento";
  if (s === "done") return "Concluído";
  return "Cancelado";
}

export function AdminRequestsClient() {
  const api = apiBaseUrl;

  const [stores, setStores] = useState<Store[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);

  const [storeId, setStoreId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [q, setQ] = useState<string>("");

  const limit = 50;
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const queryStr = useMemo(() => {
    const sp = new URLSearchParams();
    if (storeId !== "all") sp.set("storeId", storeId);
    if (status !== "all") sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    sp.set("limit", String(limit));
    sp.set("offset", String(offset));
    return sp.toString();
  }, [storeId, status, q, offset]);

  async function loadStores() {
    if (!api) return;
    const res = await fetch(`${api}/api/admin/stores`, { credentials: "include" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return;
    setStores((data.stores ?? []).map((s: any) => ({ id: s.id, name: s.name, city: s.city })));
  }

  async function load() {
    if (!api) return;

    setLoading(true);
    setMsg(null);

    const res = await fetch(`${api}/api/admin/requests?${queryStr}`, { credentials: "include" });
    const data = (await res.json().catch(() => null)) as ListResp | null;

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    if (!res.ok || !data?.ok) {
      setMsg((data as any)?.error ?? "Erro ao carregar requests");
      setLoading(false);
      return;
    }

    setRows(data.rows ?? []);
    setTotal(Number(data.total ?? 0));
    setLoading(false);
  }

  useEffect(() => {
    loadStores();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryStr]);

  useEffect(() => {
    setOffset(0);
  }, [storeId, status, q]);

  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div className="cardMeta">Loja</div>
          <select className="input" value={storeId} onChange={(e) => setStoreId(e.target.value)}>
            <option value="all">Todas</option>
            {stores.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.city} — {s.name}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div className="cardMeta">Status</div>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Todos</option>
            <option value="created">Criado</option>
            <option value="in_progress">Em andamento</option>
            <option value="done">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6, flex: 1, minWidth: 240 }}>
          <div className="cardMeta">Busca (código/email/nome)</div>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="TFX-... ou email/nome"
          />
        </label>

        <div className="cardMeta" style={{ marginLeft: "auto" }}>
          Total: <b>{total}</b>
        </div>
      </div>

      {msg && <div style={{ marginTop: 12, fontWeight: 800 }}>{msg}</div>}

      {loading ? (
        <div style={{ marginTop: 16 }}>Carregando...</div>
      ) : rows.length === 0 ? (
        <div style={{ marginTop: 16 }}>Nenhuma solicitação encontrada.</div>
      ) : (
        <div className="grid" style={{ gap: 10, marginTop: 16 }}>
          {rows.map((r) => {
            const isCancelled = r.status === "cancelled";
            return (
              <Link
                key={r.id}
                href={`/admin/requests/${r.id}`}
                className="cardLink"
                style={
                  isCancelled
                    ? {
                        border: "1px solid var(--border)",
                        background: "#fff7ed",
                      }
                    : undefined
                }
              >
                <div>
                  <div className="cardTitle">{r.code}</div>

                  <div className="cardMeta">
                    {r.store_city} — {r.store_name} • {r.model_name}
                  </div>

                  <div className="cardMeta">
                    {r.customer_name} • {r.customer_email}
                  </div>

                  <div className="cardMeta">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                    {r.last_synced_at ? (
                      <>
                        {" "}
                        • Última sync: {new Date(r.last_synced_at).toLocaleString("pt-BR")}
                      </>
                    ) : null}
                  </div>

                  {isCancelled && (r.cancel_reason || r.cancelled_at || r.cancelled_by_username) ? (
                    <div className="cardMeta" style={{ marginTop: 6 }}>
                      Cancelado
                      {r.cancelled_at ? ` em ${new Date(r.cancelled_at).toLocaleString("pt-BR")}` : ""}
                      {r.cancelled_by_username ? ` por ${r.cancelled_by_username}` : ""}
                      {r.cancel_reason ? ` — ${r.cancel_reason}` : ""}
                    </div>
                  ) : null}
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900 }}>{formatBRLFromCents(r.total_cents)}</div>
                  <div className="cardMeta">{statusLabel(r.status)}</div>
                  <div className="chev">›</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="btnRow" style={{ marginTop: 14, justifyContent: "space-between" }}>
        <button
          className="btn"
          type="button"
          disabled={offset === 0 || loading}
          onClick={() => setOffset(Math.max(0, offset - limit))}
        >
          ← Anterior
        </button>

        <div className="cardMeta">
          Página: <b>{page}</b> / <b>{totalPages}</b>
        </div>

        <button
          className="btn"
          type="button"
          disabled={offset + limit >= total || loading}
          onClick={() => setOffset(offset + limit)}
        >
          Próxima →
        </button>
      </div>
    </div>
  );
}
