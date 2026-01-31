"use client";

import { useState } from "react";
import Link from "next/link";
import { apiBaseUrl } from "@/services/api";

type AcceptResp =
  | { ok: true; id: number }
  | { ok: false; error: string; status?: string };

type LookupResp =
  | { ok: true; header: { id: number; code: string; status: string } }
  | { ok: false; error: string };

/**
 * Store flow (new plan):
 * - The store should type the customer's code.
 * - "Accept" moves created -> in_progress (only for this store).
 * - Then we redirect to the request details.
 */
export function StoreRequestsClient() {
  const api = apiBaseUrl;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const normalized = code.trim().toUpperCase();

  async function accept() {
    if (!api) return;

    const c = normalized;
    if (!c) {
      setMsg("Digite um código (TFX-...)");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: c }),
      });

      const json = (await res.json().catch(() => null)) as AcceptResp | null;

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json || !("ok" in json) || !json.ok) {
        const e = (json as any)?.error ?? "Erro ao aceitar";
        if (e === "not_found_or_not_creatable") {
          setMsg(
            "Código não encontrado, não pertence a esta loja, ou já foi aceito anteriormente."
          );
        } else {
          setMsg(e);
        }
        return;
      }

      // Go to details page
      window.location.href = `/store/requests/${encodeURIComponent(c)}`;
    } catch (e: any) {
      setMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  }

  async function viewDetails() {
    if (!api) return;

    const c = normalized;
    if (!c) {
      setMsg("Digite um código (TFX-...)");
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests/lookup?code=${encodeURIComponent(c)}`, {
        credentials: "include",
        cache: "no-store",
      });

      const json = (await res.json().catch(() => null)) as LookupResp | null;

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json || !json.ok) {
        const e = (json as any)?.error ?? "Não encontrado";
        setMsg(e);
        return;
      }

      window.location.href = `/store/requests/${encodeURIComponent(c)}`;
    } catch (e: any) {
      setMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid" style={{ gap: 12 }}>
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link className="btn" href="/store">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Buscar por código</h1>
      <p className="sub">
        Digite o código do cliente para aceitar (iniciar atendimento) ou apenas visualizar.
      </p>

      <div className="surface" style={{ padding: 16 }}>
        <div className="grid" style={{ gap: 10 }}>
          <input
            className="input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="TFX-..."
            autoCapitalize="characters"
            autoCorrect="off"
          />

          <div className="btnRow" style={{ justifyContent: "flex-end" }}>
            <button className="btn" type="button" onClick={viewDetails} disabled={loading}>
              Ver detalhes
            </button>
            <button className="btn btnPrimary" type="button" onClick={accept} disabled={loading}>
              {loading ? "Processando..." : "Aceitar e iniciar"}
            </button>
          </div>
        </div>

        {msg ? <div style={{ marginTop: 12, fontWeight: 900 }}>{msg}</div> : null}
      </div>
    </main>
  );
}
