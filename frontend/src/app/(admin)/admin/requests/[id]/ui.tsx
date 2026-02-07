"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { formatBRLFromCents } from "../../../../../lib/format";
import { formatBRPhone } from "../../../../../lib/phone";
import { apiBaseUrl } from "@/services/api";

type SyncRow = {
  id: number;
  target: string;
  status: "success" | "error" | string;
  http_status: number | null;
  created_at: string;
};

type ItemRow = {
  service_id: number;
  service_name: string;
  price_cents: number;
  currency?: string;
};

type MessageRow = {
  id: number;
  sender_type: "store" | "customer" | string;
  sender_id: number | null;
  message: string;
  created_at: string;

  // backend extras
  store_username: string | null;
  customer_name: string | null;
};

type ReadRow = {
  store_user_id: number;
  store_username: string;
  last_read_message_id: number;
  updated_at: string;
};

type Header = {
  id: number;
  code: string;

  // current statuses
  status: "created" | "in_progress" | "done" | "cancelled" | string;

  created_at: string;
  total_cents: number;
  currency: string;
  last_synced_at: string | null;

  store_id: number;
  store_name: string;
  store_city: string;
  store_address: string;

  model_id: number;
  model_name: string;

  customer_name: string;
  customer_email: string;
  customer_phone: string | null;

  // cancellation (backend fields)
  cancelled_at: string | null;
  cancel_reason: string | null;
  cancelled_by_store_user_id: number | null;
  cancelled_by_username: string | null;

  // chat controls (admin)
  customer_messages_blocked: boolean | null;
  customer_messages_blocked_at: string | null;
  customer_messages_blocked_by: string | null;
};

type DetailsResp = {
  ok: true;
  header: Header;
  items: ItemRow[];
  syncs: SyncRow[];
  messages: MessageRow[];
  reads: ReadRow[];
};

function statusLabel(s: string) {
  if (s === "created") return "Criado";
  if (s === "in_progress") return "Em andamento";
  if (s === "done") return "Concluído";
  if (s === "cancelled") return "Cancelado";
  return s;
}

function senderLabel(m: MessageRow) {
  if (m.sender_type === "store") return m.store_username ? `Loja (${m.store_username})` : "Loja";
  if (m.sender_type === "customer") return m.customer_name ? `Cliente (${m.customer_name})` : "Cliente";
  return m.sender_type;
}

export function AdminRequestDetailsClient() {
  const api = apiBaseUrl;

  const params = useParams() as Record<string, string | string[] | undefined>;
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [data, setData] = useState<DetailsResp | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingChatBlock, setSavingChatBlock] = useState(false);

  async function load() {
    if (!id) return;

    setLoading(true);
    setMsg(null);

    const res = await fetch(`${api}/api/admin/requests/${encodeURIComponent(id)}`, {
      credentials: "include",
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    if (!res.ok || !json?.ok) {
      setMsg(json?.error ?? "Erro ao carregar");
      setLoading(false);
      return;
    }

    setData(json as DetailsResp);
    setLoading(false);
  }

  async function retrySync() {
    if (!id) return;

    setSyncing(true);
    setMsg(null);

    const res = await fetch(`${api}/api/admin/requests/${encodeURIComponent(id)}/sync`, {
      method: "POST",
      credentials: "include",
    });
    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    if (!res.ok || !json?.ok) {
      setMsg(json?.error ?? "Erro ao sincronizar");
      setSyncing(false);
      return;
    }

    setMsg("Sincronizado ✅");
    setSyncing(false);
    load();
  }

  async function updateStatus(newStatus: string) {
    if (!id) return;

    if (newStatus === "cancelled") {
      const ok = confirm("Marcar como CANCELADO?\n\nIsso deve ser usado somente quando necessário.");
      if (!ok) return;
    }

    setSavingStatus(true);
    setMsg(null);

    const res = await fetch(`${api}/api/admin/requests/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: newStatus }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    // if you haven't implemented this endpoint yet, show a helpful message
    if (res.status === 404) {
      setMsg("Endpoint de status ainda não existe: PATCH /admin/requests/:id/status");
      setSavingStatus(false);
      return;
    }

    if (!res.ok || !json?.ok) {
      setMsg(json?.error ?? "Erro ao atualizar status");
      setSavingStatus(false);
      return;
    }

    setMsg("Status atualizado ✅");
    setSavingStatus(false);
    load();
  }

  async function setCustomerMessagesBlocked(blocked: boolean) {
    if (!id) return;

    if (blocked) {
      const ok = confirm(
        "Bloquear mensagens do cliente?\n\nO cliente não conseguirá enviar novas mensagens neste request (a loja ainda pode responder)."
      );
      if (!ok) return;
    }

    setSavingChatBlock(true);
    setMsg(null);

    const res = await fetch(`${api}/api/admin/requests/${encodeURIComponent(id)}/customer-messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ blocked }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    if (res.status === 404) {
      setMsg("Endpoint ainda não existe: PATCH /admin/requests/:id/customer-messages");
      setSavingChatBlock(false);
      return;
    }

    if (!res.ok || !json?.ok) {
      setMsg(json?.error ?? "Erro ao atualizar bloqueio de mensagens");
      setSavingChatBlock(false);
      return;
    }

    setMsg(blocked ? "Mensagens do cliente bloqueadas ✅" : "Mensagens do cliente liberadas ✅");
    setSavingChatBlock(false);
    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const h = data?.header;

  const cancellationInfo = useMemo(() => {
    if (!h) return null;

    const show =
      h.status === "cancelled" ||
      !!h.cancelled_at ||
      h.cancel_reason !== null ||
      !!h.cancelled_by_store_user_id ||
      !!h.cancelled_by_username;

    if (!show) return null;

    const reasonRaw = (h.cancel_reason ?? "").trim();
    const reason = reasonRaw.length ? reasonRaw : "(vazio)";

    const cancelledAt = h.cancelled_at ? new Date(h.cancelled_at).toLocaleString("pt-BR") : null;

    const by =
      h.cancelled_by_username || h.cancelled_by_store_user_id
        ? `${h.cancelled_by_username ?? "Loja"}${h.cancelled_by_store_user_id ? ` #${h.cancelled_by_store_user_id}` : ""}`
        : null;

    return { reason, cancelledAt, by };
  }, [h]);

  if (loading) {
    return (
      <>
        <div className="btnRow" style={{ marginTop: 6 }}>
          <Link href="/admin/requests" className="btn">
            ← Voltar
          </Link>
        </div>

        <div className="surface" style={{ padding: 16, marginTop: 12 }}>
          Carregando...
        </div>
      </>
    );
  }

  if (!data || !h) {
    return (
      <>
        <div className="btnRow" style={{ marginTop: 6 }}>
          <Link href="/admin/requests" className="btn">
            ← Voltar
          </Link>
        </div>

        <div className="surface" style={{ padding: 16, marginTop: 12 }}>
          {msg ?? "Não encontrado."}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin/requests" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2" style={{ marginTop: 12 }}>
        {h.code}
      </h1>
      <p className="sub">Detalhes do request</p>

      {msg && <div style={{ marginTop: 10, fontWeight: 900 }}>{msg}</div>}

      <div className="surface" style={{ padding: 16, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 900 }}>{h.store_name}</div>
            <div className="cardMeta">
              {h.store_city} • {h.store_address}
            </div>

            <div className="cardMeta" style={{ marginTop: 6 }}>
              Modelo: <b>{h.model_name}</b>
            </div>

            <div className="cardMeta" style={{ marginTop: 6 }}>
              Cliente: <b>{h.customer_name}</b> • {h.customer_email}
              {h.customer_phone ? ` • ${formatBRPhone(h.customer_phone)}` : ""}
            </div>

            <div className="cardMeta" style={{ marginTop: 6 }}>
              Criado em: {new Date(h.created_at).toLocaleString("pt-BR")}
              {h.last_synced_at ? <> • Última sync: {new Date(h.last_synced_at).toLocaleString("pt-BR")}</> : null}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="cardMeta">Status</div>

            <select
              className="input"
              value={h.status}
              disabled={savingStatus}
              onChange={(e) => updateStatus(e.target.value)}
              style={{ minWidth: 180 }}
            >
              <option value="created">created</option>
              <option value="in_progress">in_progress</option>
              <option value="done">done</option>
              <option value="cancelled">cancelled</option>
            </select>

            <div className="cardMeta" style={{ marginTop: 8 }}>
              {statusLabel(h.status)}
            </div>

            <div style={{ marginTop: 10, fontWeight: 900 }}>{formatBRLFromCents(h.total_cents)}</div>
          </div>
        </div>

        <div className="btnRow" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btnPrimary" type="button" onClick={retrySync} disabled={syncing}>
            {syncing ? "Sincronizando..." : "Retry Sync"}
          </button>

          <button
            className={`btn ${h.customer_messages_blocked ? "btnPrimary" : ""}`}
            type="button"
            disabled={savingChatBlock}
            onClick={() => setCustomerMessagesBlocked(!Boolean(h.customer_messages_blocked))}
            title="Bloqueia apenas o envio de mensagens do cliente (a loja ainda pode responder)."
          >
            {savingChatBlock
              ? "Salvando..."
              : h.customer_messages_blocked
                ? "Desbloquear mensagens do cliente"
                : "Bloquear mensagens do cliente"}
          </button>

          {h.customer_messages_blocked ? (
            <div className="cardMeta" style={{ alignSelf: "center" }}>
              Bloqueado em{" "}
              {h.customer_messages_blocked_at ? new Date(h.customer_messages_blocked_at).toLocaleString("pt-BR") : "-"}
              {h.customer_messages_blocked_by ? ` • por ${h.customer_messages_blocked_by}` : ""}
            </div>
          ) : null}
        </div>
      </div>

      {/* Cancellation box */}
      {cancellationInfo ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Cancelamento</div>

          <div className="surface" style={{ padding: 14 }}>
            <div className="cardMeta" style={{ marginBottom: 8 }}>
              Status atual: <b>{statusLabel(h.status)}</b>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <div className="cardMeta">Motivo</div>
                <div style={{ fontWeight: 900, whiteSpace: "pre-wrap" }}>{cancellationInfo.reason}</div>
              </div>

              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <div className="cardMeta">Cancelado em</div>
                  <div style={{ fontWeight: 900 }}>{cancellationInfo.cancelledAt ?? "-"}</div>
                </div>

                <div>
                  <div className="cardMeta">Cancelado por</div>
                  <div style={{ fontWeight: 900 }}>{cancellationInfo.by ?? "-"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Serviços</div>

        <div className="grid" style={{ gap: 10 }}>
          {data.items.map((it) => (
            <div key={it.service_id} className="surface" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 900 }}>{it.service_name}</div>
                <div style={{ fontWeight: 900 }}>{formatBRLFromCents(it.price_cents)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Mensagens</div>

        {data.messages.length === 0 ? (
          <div className="surface" style={{ padding: 14 }}>
            Nenhuma mensagem.
          </div>
        ) : (
          <div className="surface" style={{ padding: 14 }}>
            <div style={{ display: "grid", gap: 10 }}>
              {data.messages.map((m) => (
                <div key={m.id} style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900 }}>{senderLabel(m)}</div>
                    <div className="cardMeta">{new Date(m.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
                  <div className="cardMeta">#{m.id}</div>
                  <div style={{ height: 1, background: "var(--border)", marginTop: 6 }} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Read tracking */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Leituras (Inbox)</div>

        {data.reads.length === 0 ? (
          <div className="surface" style={{ padding: 14 }}>
            Nenhuma leitura registrada.
          </div>
        ) : (
          <div className="surface" style={{ padding: 14 }}>
            <div className="grid" style={{ gap: 10 }}>
              {data.reads.map((r) => (
                <div key={r.store_user_id} className="surface" style={{ padding: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>
                        {r.store_username} <span className="cardMeta">#{r.store_user_id}</span>
                      </div>
                      <div className="cardMeta">Última mensagem lida: #{r.last_read_message_id}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="cardMeta">Atualizado em</div>
                      <div style={{ fontWeight: 900 }}>{new Date(r.updated_at).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Histórico de sync</div>

        {data.syncs.length === 0 ? (
          <div className="surface" style={{ padding: 14 }}>
            Nenhuma tentativa ainda.
          </div>
        ) : (
          <div className="grid" style={{ gap: 10 }}>
            {data.syncs.map((s) => (
              <div key={s.id} className="surface" style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{s.status === "success" ? "✅ Sucesso" : "⚠️ Erro"}</div>
                    <div className="cardMeta">{s.target}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 900 }}>{s.http_status ?? "-"}</div>
                    <div className="cardMeta">{new Date(s.created_at).toLocaleString("pt-BR")}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
