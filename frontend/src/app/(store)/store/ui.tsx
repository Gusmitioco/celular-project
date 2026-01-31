"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatBRLFromCents } from "../../../lib/format";
import { statusLabel } from "../../../lib/statusLabel";
import { apiBaseUrl } from "@/services/api";

type Row = {
  id: number;
  code: string;
  status: string;
  created_at: string;
  total_cents: number;
  currency: string;
  model_name: string;
  customer_name: string;
};

type Resp = {
  ok: true;
  rows: Row[];
  counts: { created: number; in_progress: number; done: number; cancelled?: number };
};

export function StoreDashboardClient() {
  const api = apiBaseUrl;

  // Store dashboard shows in_progress + done + cancelled
  const [status, setStatus] = useState<"in_progress" | "done" | "cancelled">("in_progress");

  // filter list
  const [q, setQ] = useState("");

  // accept-by-code
  const [acceptCode, setAcceptCode] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [acceptMsg, setAcceptMsg] = useState<string | null>(null);

  // list state
  const [data, setData] = useState<Resp | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // logout
  const [loggingOut, setLoggingOut] = useState(false);

  const qs = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    return sp.toString();
  }, [status, q]);

  async function logout() {
    if (!api) {
      window.location.href = "/store/login";
      return;
    }

    setLoggingOut(true);
    setMsg(null);

    await fetch(`${api}/api/store-auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);

    window.location.href = "/store/login";
  }

  async function load() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests?${qs}`, {
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "Erro ao carregar");
        setData(null);
        return;
      }

      setData(json);
    } catch (e: any) {
      setMsg(String(e?.message ?? "Erro de conexão"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function acceptByCode() {
    if (!api) return;

    const code = acceptCode.trim().toUpperCase();
    if (!code) {
      setAcceptMsg("Digite um código (ex: TFX-ABC123).");
      return;
    }
    if (code.length > 40) {
      setAcceptMsg("Código muito longo.");
      return;
    }

    setAccepting(true);
    setAcceptMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        const e = json?.error ?? "Não foi possível iniciar o atendimento.";

        if (e === "not_found_or_not_creatable") {
          setAcceptMsg(
            "Não foi possível iniciar: código não existe, não pertence à sua loja, ou já foi iniciado/concluído."
          );
        } else if (e === "code_required") {
          setAcceptMsg("Digite um código.");
        } else if (e === "code_too_long") {
          setAcceptMsg("Código muito longo.");
        } else {
          setAcceptMsg(e);
        }

        return;
      }

      // Success: go straight to details page
      window.location.href = `/store/requests/${encodeURIComponent(code)}`;
    } catch (e: any) {
      setAcceptMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setAccepting(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const counts = {
    created: data?.counts?.created ?? 0,
    in_progress: data?.counts?.in_progress ?? 0,
    done: data?.counts?.done ?? 0,
    // backwards-compatible: older backends won't return it
    cancelled: (data as any)?.counts?.cancelled ?? 0,
  };

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div className="btnRow" style={{ justifyContent: "space-between" }}>
        <div className="btnRow">
          <button
            className={`btn ${status === "in_progress" ? "btnPrimary" : ""}`}
            onClick={() => setStatus("in_progress")}
            type="button"
          >
            Em andamento ({counts.in_progress})
          </button>

          <button
            className={`btn ${status === "done" ? "btnPrimary" : ""}`}
            onClick={() => setStatus("done")}
            type="button"
          >
            Concluídos ({counts.done})
          </button>

          <button
            className={`btn ${status === "cancelled" ? "btnPrimary" : ""}`}
            onClick={() => setStatus("cancelled")}
            type="button"
          >
            Cancelados ({counts.cancelled})
          </button>
        </div>

        <div className="btnRow">
          <button className="btn" onClick={load} disabled={loading} type="button">
            Atualizar
          </button>
          <button className="btn" onClick={logout} disabled={loggingOut} type="button">
            {loggingOut ? "Saindo..." : "Logout"}
          </button>
        </div>
      </div>

      {/* Accept by code */}
      <div className="surface" style={{ padding: 14, marginTop: 12 }}>
        <div style={{ fontWeight: 900 }}>Iniciar atendimento por código</div>
        <div className="cardMeta" style={{ marginTop: 4 }}>
          Peça o código ao cliente e cole aqui para iniciar o atendimento.
        </div>

        <div className="btnRow" style={{ marginTop: 10 }}>
          <input
            className="input"
            value={acceptCode}
            onChange={(e) => setAcceptCode(e.target.value)}
            placeholder="TFX-ABC123"
            style={{ flex: 1 }}
          />
          <button className="btn btnPrimary" type="button" onClick={acceptByCode} disabled={accepting}>
            {accepting ? "Iniciando..." : "Iniciar"}
          </button>
          <Link className="btn" href="/store/requests">
            Buscar por código
          </Link>
        </div>

        {acceptMsg ? <div style={{ marginTop: 10, fontWeight: 900 }}>{acceptMsg}</div> : null}
      </div>

      {/* Filter list */}
      <div className="grid" style={{ marginTop: 12 }}>
        <input
          className="input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por código (TFX-...)"
        />
      </div>

      {msg && <div style={{ marginTop: 12, fontWeight: 900 }}>{msg}</div>}

      {loading ? (
        <div style={{ marginTop: 12 }}>Carregando...</div>
      ) : (data?.rows?.length ?? 0) === 0 ? (
        <div style={{ marginTop: 12 }} className="cardMeta">
          Nenhum atendimento aqui ainda. Para iniciar, use o código do cliente acima.
        </div>
      ) : (
        <div className="grid" style={{ gap: 10, marginTop: 12 }}>
          {data!.rows.map((r) => (
            <Link
              key={r.id}
              href={`/store/requests/${encodeURIComponent(r.code)}`}
              className="surface"
              style={{ padding: 14, textDecoration: "none", color: "inherit" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{r.code}</div>
                  <div className="cardMeta">
                    {r.customer_name} • {r.model_name}
                  </div>
                  <div className="cardMeta">
                    {new Date(r.created_at).toLocaleString("pt-BR")} • status:{" "}
                    <b>{statusLabel(r.status)}</b>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900 }}>{formatBRLFromCents(r.total_cents)}</div>
                  <div className="cardMeta">abrir ›</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
