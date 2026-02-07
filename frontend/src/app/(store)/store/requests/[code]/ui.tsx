"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { formatBRLFromCents } from "../../../../../lib/format";
import { formatBRPhone } from "../../../../../lib/phone";
import { statusLabel } from "../../../../../lib/statusLabel";
import { apiBaseUrl } from "@/services/api";

type Item = { service_id: number; service_name: string; price_cents: number };

type MessageRow = {
  id: number;
  sender_type: string;
  sender_id: number | null;
  message: string;
  created_at: string;
};

type Resp = {
  ok: true;
  header: any;
  items: Item[];
};

export function StoreRequestDetailsClient() {
  const api = apiBaseUrl;
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? "");

  const [data, setData] = useState<Resp | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // status actions
  const [saving, setSaving] = useState(false);

  // cancel flow
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  // chat
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatText, setChatText] = useState("");
  const [chatErr, setChatErr] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests/lookup?code=${encodeURIComponent(code)}`, {
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "Não encontrado");
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

  /**
   * Accept-by-code (created -> in_progress)
   * POST /store/requests/accept { code }
   */
  async function acceptByCode() {
    const c = String(code ?? "").trim().toUpperCase();
    if (!c) return;

    const ok = confirm("Aceitar este atendimento?\n\nIsso vai marcar como “Em andamento”.");
    if (!ok) return;

    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: c }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        const e = json?.error ?? "Não foi possível aceitar.";
        if (e === "not_found_or_not_creatable") {
          setMsg("Não foi possível aceitar: código inválido, já aceito/concluído/cancelado, ou não pertence à sua loja.");
        } else {
          setMsg(e);
        }
        return;
      }

      setMsg("Atendimento aceito (em andamento) ✅");
      setCancelOpen(false);
      setCancelReason("");
      setCancelErr(null);
      await load();
    } catch (e: any) {
      setMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Complete (in_progress -> done)
   * PATCH /store/requests/:id/status { status: "done" }
   */
  async function setDone() {
    if (!data) return;

    const ok = confirm("Marcar como CONCLUÍDO?\n\nIsso encerra o atendimento.");
    if (!ok) return;

    setSaving(true);
    setMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests/${data.header.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "done" }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "Erro ao atualizar status");
        return;
      }

      setMsg("Marcado como concluído ✅");
      setCancelOpen(false);
      setCancelReason("");
      setCancelErr(null);
      await load();
    } catch (e: any) {
      setMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setSaving(false);
    }
  }

  /**
   * Cancel (in_progress -> cancelled)
   * POST /store/requests/:id/cancel { reason }
   *
   * Store may leave reason blank (we still store it as null).
   */
  async function cancelInProgress() {
    if (!data) return;

    const reason = cancelReason.trim();
    if (reason.length > 1000) {
      setCancelErr("Motivo muito longo (máx 1000 caracteres).");
      return;
    }

    const ok = confirm("Cancelar este atendimento?\n\nIsso vai registrar o motivo (se houver) e encerrar o atendimento.");
    if (!ok) return;

    setSaving(true);
    setCancelErr(null);
    setMsg(null);

    try {
      const res = await fetch(`${api}/api/store/requests/${data.header.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        setCancelErr(json?.error ?? "Erro ao cancelar");
        return;
      }

      setMsg("Atendimento cancelado ✅");
      setCancelOpen(false);
      setCancelReason("");
      await load();
    } catch (e: any) {
      setCancelErr(String(e?.message ?? "Erro de conexão"));
    } finally {
      setSaving(false);
    }
  }

  async function loadMessages(requestId: number) {
    setChatLoading(true);
    setChatErr(null);

    const res = await fetch(`${api}/api/store/requests/${requestId}/messages`, {
      credentials: "include",
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      window.location.href = "/store/login";
      return;
    }

    if (!res.ok || !json?.ok) {
      setChatErr(json?.error ?? "Erro ao carregar mensagens");
      setChatLoading(false);
      return;
    }

    setMessages(json.rows ?? []);
    setChatLoading(false);
  }

  async function sendMessage(requestId: number) {
    const text = chatText.trim();
    if (!text) return;

    setChatErr(null);

    const res = await fetch(`${api}/api/store/requests/${requestId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: text }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 401) {
      window.location.href = "/store/login";
      return;
    }

    if (!res.ok || !json?.ok) {
      setChatErr(json?.error ?? "Erro ao enviar mensagem");
      return;
    }

    setChatText("");
    await loadMessages(requestId);
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const requestId = useMemo(() => {
    const id = Number(data?.header?.id);
    return Number.isFinite(id) ? id : null;
  }, [data?.header?.id]);

  const status = String(data?.header?.status ?? "");
  const chatEnabled = status === "in_progress" || status === "done" || status === "cancelled";

  // load + poll messages only when chat is enabled
  useEffect(() => {
    if (!requestId) return;
    if (!chatEnabled) return;

    let alive = true;

    const tick = async () => {
      if (!alive) return;
      if (document.hidden) return;
      await loadMessages(requestId);
    };

    tick();
    const t = setInterval(tick, 5000);

    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, chatEnabled]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading) {
    return (
      <>
        <div className="btnRow" style={{ marginTop: 6 }}>
          <Link className="btn" href="/store">
            ← Voltar
          </Link>
        </div>
        <div className="surface" style={{ padding: 16, marginTop: 12 }}>
          Carregando...
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <div className="btnRow" style={{ marginTop: 6 }}>
          <Link className="btn" href="/store">
            ← Voltar
          </Link>
        </div>
        <div className="surface" style={{ padding: 16, marginTop: 12 }}>
          {msg ?? "Não encontrado."}
        </div>
      </>
    );
  }

  const h = data.header;

  const canAccept = h.status === "created";
  const canCompleteOrCancel = h.status === "in_progress";
  const isDone = h.status === "done";
  const isCancelled = h.status === "cancelled";

  return (
    <>
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link className="btn" href="/store">
          ← Voltar
        </Link>
        <Link className="btn" href="/store/requests">
          Buscar outro código
        </Link>
      </div>

      <h1 className="h2" style={{ marginTop: 12 }}>
        {h.code}
      </h1>
      <p className="sub">Detalhes do atendimento</p>

      {msg && <div style={{ marginTop: 10, fontWeight: 900 }}>{msg}</div>}

      <div className="surface" style={{ padding: 16, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
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
              Status atual: <b>{statusLabel(h.status)}</b>
            </div>

            <div className="cardMeta" style={{ marginTop: 6 }}>
              Criado em: {new Date(h.created_at).toLocaleString("pt-BR")}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div className="cardMeta">Total</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{formatBRLFromCents(h.total_cents)}</div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="btnRow" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <div className="btnRow" style={{ flexWrap: "wrap" }}>
            {canAccept ? (
              <button className="btn btnPrimary" type="button" disabled={saving} onClick={acceptByCode}>
                Aceitar atendimento
              </button>
            ) : null}

            {canCompleteOrCancel ? (
              <>
                <button className="btn btnPrimary" type="button" disabled={saving} onClick={setDone}>
                  Concluir
                </button>
                <button className="btn" type="button" disabled={saving} onClick={() => setCancelOpen((v) => !v)}>
                  {cancelOpen ? "Fechar cancelamento" : "Cancelar"}
                </button>
              </>
            ) : null}

            {isDone ? <div className="cardMeta">Este atendimento já foi concluído.</div> : null}

            {isCancelled ? (
              <div className="cardMeta">
                Este atendimento foi <b>cancelado</b>.
                {h.cancelled_reason ? (
                  <>
                    {" "}
                    Motivo: <b>{h.cancelled_reason}</b>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {cancelOpen && canCompleteOrCancel ? (
          <div className="surface" style={{ padding: 14, marginTop: 12, background: "rgba(0,0,0,0.02)" }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Cancelar atendimento</div>
            <div className="cardMeta" style={{ marginBottom: 10 }}>
              Motivo é opcional, mas ajuda a entender cancelamentos e melhorar o sistema.
            </div>

            <textarea
              className="input"
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Ex: cliente desistiu / aparelho sem conserto / orçamento recusado..."
            />

            {cancelErr ? <div style={{ marginTop: 8, fontWeight: 900 }}>{cancelErr}</div> : null}

            <div className="btnRow" style={{ justifyContent: "flex-end", marginTop: 10 }}>
              <button
                className="btn"
                type="button"
                disabled={saving}
                onClick={() => {
                  setCancelOpen(false);
                  setCancelErr(null);
                }}
              >
                Voltar
              </button>
              <button className="btn btnPrimary" type="button" disabled={saving} onClick={cancelInProgress}>
                Confirmar cancelamento
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Services */}
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

      {/* Chat (LOCKED until in_progress) */}
      <div style={{ marginTop: 18 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Chat com o cliente</div>

        {!chatEnabled ? (
          <div className="surface" style={{ padding: 14 }}>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Chat indisponível</div>
            <div className="cardMeta">
              O chat só fica disponível depois que a loja <b>aceita</b> o atendimento (status: <b>Em andamento</b>).
              <br />
              Se o atendimento foi cancelado, o chat permanece fechado.
            </div>
          </div>
        ) : (
          <div className="surface" style={{ padding: 14 }}>
            <div className="btnRow" style={{ justifyContent: "space-between" }}>
              <div className="cardMeta">Mensagens (atualiza automaticamente)</div>
              <button className="btn" type="button" onClick={() => requestId && loadMessages(requestId)} disabled={chatLoading}>
                Atualizar
              </button>
            </div>

            {chatErr && <div style={{ marginTop: 10, fontWeight: 900 }}>{chatErr}</div>}

            <div
              style={{
                marginTop: 12,
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 12,
                height: 260,
                overflow: "auto",
                // Keep readable on dark theme (avoid white panel with light text)
                background: "rgba(0, 0, 0, 0.18)",
              }}
            >
              {chatLoading && messages.length === 0 ? (
                <div className="cardMeta">Carregando mensagens...</div>
              ) : messages.length === 0 ? (
                <div className="cardMeta">Nenhuma mensagem ainda.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {messages.map((m) => {
                    const mine = m.sender_type === "store";
                    return (
                      <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                        <div
                          style={{
                            maxWidth: "80%",
                            padding: "10px 12px",
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            // Keep both sides readable on the dark theme.
                            background: mine ? "var(--card)" : "rgba(255, 255, 255, 0.10)",
                          }}
                        >
                          <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                            {mine ? "Loja" : m.sender_type === "customer" ? "Cliente" : m.sender_type}
                            {" • "}
                            <span className="cardMeta">{new Date(m.created_at).toLocaleString("pt-BR")}</span>
                          </div>
                          <div style={{ whiteSpace: "pre-wrap" }}>{m.message}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>
              )}
            </div>

            <div className="grid" style={{ marginTop: 12, gap: 10 }}>
              <textarea
                className="input"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Digite uma mensagem..."
                rows={3}
              />
              <div className="btnRow" style={{ justifyContent: "flex-end" }}>
                <button
                  className="btn btnPrimary"
                  type="button"
                  onClick={() => requestId && sendMessage(requestId)}
                  disabled={!requestId}
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
