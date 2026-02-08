"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { ClientShell } from "@/components/layout/ClientShell";
import { Card } from "@/components/ui/Card";
import { api, apiBaseUrl } from "@/services/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";

type Header = {
  id: number;
  code: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
  last_synced_at?: string | null;
  store_name: string;
  store_address: string;
  model_name: string;
};

type Item = {
  service_id: number;
  service_name: string;
  price_cents: number;
  currency: string;
  screen_option_id?: number | null;
  screen_option_label?: string | null;
};

type Msg = {
  id: number;
  sender_type: "customer" | "store" | "admin" | string;
  sender_id: number | null;
  message: string;
  created_at: string;
};

function statusPT(status: string) {
  const s = (status || "").toLowerCase().trim();
  const map: Record<string, string> = {
    created: "Criado",
    in_progress: "Em andamento",
    done: "Concluído",
    cancelled: "Cancelado",
  };
  return map[s] ?? status;
}

function formatMoneyBRL(cents: number) {
  const v = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${v}`;
}

function formatDateBR(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Page() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? "").trim();

  const router = useRouter();

  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [header, setHeader] = React.useState<Header | null>(null);
  const [items, setItems] = React.useState<Item[]>([]);

  const [msgLoading, setMsgLoading] = React.useState(false);
  const [msgError, setMsgError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [draft, setDraft] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // realtime (socket.io) for chat
  const [socket, setSocket] = React.useState<Socket | null>(null);
  const [rtStatus, setRtStatus] = React.useState<"connecting" | "online" | "offline">("offline");
  const [joinedRequestId, setJoinedRequestId] = React.useState<number | null>(null);
  const joinedRequestIdRef = React.useRef<number | null>(null);
  const chatScrollRef = React.useRef<HTMLDivElement | null>(null);

  const scrollChatToBottom = React.useCallback((behavior: ScrollBehavior = "auto") => {
    const el = chatScrollRef.current;
    if (!el) return;
    // Scroll ONLY inside the chat container to avoid jumping the whole page.
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const loginHref = `/login?returnTo=${encodeURIComponent(`/meus-pedidos/${code}`)}`;
  const cadastroHref = `/cadastro?returnTo=${encodeURIComponent(`/meus-pedidos/${code}`)}`;

  const chatAllowed = (status?: string) => {
    const s = (status || "").toLowerCase();
    return s === "in_progress" || s === "done" || s === "cancelled";
  };

  const load = React.useCallback(async () => {
    if (!code) return;
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const out = await api.getMyRequest(code);
      setHeader(out.header);
      setItems(out.items ?? []);
    } catch (e: any) {
      setError(e?.message || "Erro ao carregar o pedido");
      setHeader(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [code, user]);

  const loadMessages = React.useCallback(async () => {
    if (!code) return;
    if (!user) return;
    if (!chatAllowed(header?.status)) {
      setMessages([]);
      setMsgError(null);
      return;
    }

    setMsgLoading(true);
    setMsgError(null);
    try {
      const rows = await api.listMyRequestMessages(code);
      setMessages(rows as any);
    } catch (e: any) {
      // Backend can return 403 when chat is locked or blocked
      setMsgError(
        "O chat ficará disponível quando o pedido estiver em andamento. Se estiver bloqueado, aguarde atualizações da loja."
      );
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, [code, user, header?.status]);

  // Realtime chat: connect + join request room (customer joins by code)
  React.useEffect(() => {
    if (!user) return;
    if (!code) return;
    if (!chatAllowed(header?.status)) {
      setJoinedRequestId(null);
      joinedRequestIdRef.current = null;
      return;
    }

    // For sockets we want the backend origin, not the REST prefix.
    const s = getSocket(apiBaseUrl);
    setSocket(s);
    setRtStatus("connecting");

    const onConnect = () => setRtStatus("online");
    const onDisconnect = () => setRtStatus("offline");

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);

    // join by code
    s.emit("request:join", { code }, (ack: any) => {
      if (!ack?.ok) {
        setJoinedRequestId(null);
        joinedRequestIdRef.current = null;
        // keep REST working; just show small hint
        setRtStatus("offline");
        return;
      }
      const rid = Number(ack.requestId);
      if (!Number.isFinite(rid)) return;
      setJoinedRequestId(rid);
      joinedRequestIdRef.current = rid;
    });

    const onNewMessage = (m: any) => {
      const rid = Number(m?.request_id);
      const msgId = Number(m?.id);
      if (!Number.isFinite(rid) || !Number.isFinite(msgId)) return;

      // For customer sockets we only join one request at a time, but keep a guard.
      const current = joinedRequestIdRef.current;
      if (current && rid !== current) return;

      setMessages((prev) => {
        if (prev.some((x) => x.id === msgId)) return prev;
        return [...prev, m];
      });
      // Wait a tick for the message to render, then scroll within the container.
      setTimeout(() => scrollChatToBottom("smooth"), 30);
    };

    s.on("message:new", onNewMessage);

    return () => {
      // Best-effort leave
      const rid = joinedRequestIdRef.current;
      if (rid) s.emit("request:leave", { requestId: rid });
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("message:new", onNewMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, code, header?.status]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      setError(null);
      setHeader(null);
      setItems([]);
      return;
    }
    load();
  }, [authLoading, user, load]);

  React.useEffect(() => {
    if (!user) return;
    if (!header) return;
    loadMessages();
  }, [user, header, loadMessages]);

  React.useEffect(() => {
    if (!chatAllowed(header?.status)) return;
    // Keep the chat pinned to the bottom without affecting the page scroll.
    scrollChatToBottom("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  };

  const onSend = async () => {
    const msg = draft.trim();
    if (!msg || sending) return;

    setSending(true);
    try {
      await api.sendMyRequestMessage(code, msg);
      setDraft("");
      // REST endpoint already emits realtime events; also refresh as fallback
      if (!socket) await loadMessages();
    } catch {
      setMsgError("Não foi possível enviar a mensagem agora.");
    } finally {
      setSending(false);
    }
  };

  const canDelete = String(header?.status ?? "").toLowerCase().trim() === "created";

  const onDelete = async () => {
    if (!user) return;
    if (!code) return;
    if (!canDelete) return;
    if (deleting) return;

    const ok = window.confirm(
      "Cancelar este pedido?\n\nIsso vai apagar completamente o pedido e não poderá ser desfeito."
    );
    if (!ok) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteMyRequest(code);
      // Redirect back to the list with a friendly success banner.
      router.replace(`/meus-pedidos?deleted=${encodeURIComponent(code)}`);
    } catch (e: any) {
      const err = e?.bodyJson?.error ?? "";
      if (err === "cannot_delete_status") {
        setDeleteError("Este pedido já está em andamento e não pode mais ser cancelado.");
      } else if (err === "not_found") {
        setDeleteError("Pedido não encontrado.");
      } else {
        setDeleteError("Não foi possível cancelar o pedido agora. Tente novamente.");
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ClientShell title="Detalhes do pedido" maxWidthClassName="max-w-5xl">
      <div className="space-y-4">
        {authLoading ? <p className="text-sm text-dracula-text/70">Carregando…</p> : null}

        {!authLoading && !user ? (
          <Card>
            <p className="text-sm text-dracula-text">
              Para ver os detalhes deste pedido, você precisa estar logado.
            </p>
            <p className="mt-2 text-xs text-dracula-text/70">
              Assim você consegue acompanhar o status, ver o código sempre que quiser e usar o chat.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={loginHref}
                className="rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.12] glass-fix transition hover:bg-white/[0.11]"
              >
                Fazer login
              </Link>
              <Link
                href={cadastroHref}
                className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white"
              >
                Criar conta
              </Link>
            </div>
          </Card>
        ) : null}

        {user && (loading || !header) ? (
          <Card>
            {loading ? (
              <p className="text-sm text-dracula-text/70">Carregando pedido…</p>
            ) : (
              <p className="text-sm text-dracula-text/80">
                {error ?? "Pedido não encontrado."}
              </p>
            )}
          </Card>
        ) : null}

        {user && header ? (
          <>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-dracula-text/70">Código</div>
                  <div className="mt-1 font-mono text-2xl text-dracula-text">{header.code}</div>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="mt-2 text-xs font-semibold text-dracula-accent hover:brightness-95"
                  >
                    Copiar código
                  </button>

                  <div className="mt-3 text-xs text-dracula-text/70">Modelo</div>
                  <div className="mt-1 text-sm font-semibold text-dracula-text">{header.model_name}</div>
                  <div className="mt-3 text-xs text-dracula-text/70">Criado em</div>
                  <div className="mt-1 text-sm text-dracula-text/80">{formatDateBR(header.created_at)}</div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-semibold text-dracula-text/70">Total</div>
                  <div className="mt-1 text-lg font-semibold text-dracula-text">{formatMoneyBRL(header.total_cents)}</div>
                  <div className="mt-3 text-xs text-dracula-text/70">Status</div>
                  <div className="mt-1 text-base font-bold text-dracula-text">{statusPT(header.status)}</div>

                  {canDelete ? (
                    <div className="mt-4 flex flex-col items-end gap-2">
                      {deleteError ? <p className="text-xs text-dracula-accent2">{deleteError}</p> : null}
                      <button
                        type="button"
                        onClick={onDelete}
                        disabled={deleting}
                        className="rounded-xl bg-white/[0.10] px-4 py-2 text-sm font-semibold text-dracula-accent2 ring-1 ring-white/15 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleting ? "Cancelando…" : "Cancelar pedido"}
                      </button>
                      <p className="text-[11px] text-dracula-text/55">
                        Disponível apenas enquanto o pedido estiver aberto.
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card>
              <div className="text-sm font-semibold text-dracula-text">Serviços</div>
              {items.length === 0 ? (
                <p className="mt-2 text-sm text-dracula-text/70">Nenhum item encontrado.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {items.map((it) => (
                    <li key={it.service_id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-dracula-text">
                        {it.screen_option_label ? `${it.service_name} — ${it.screen_option_label}` : it.service_name}
                      </span>
                      <span className="text-sm font-semibold text-dracula-text">{formatMoneyBRL(it.price_cents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <div className="text-sm font-semibold text-dracula-text">Onde levar o aparelho</div>
              <p className="mt-2 text-sm text-dracula-text/85">
                <span className="font-semibold">{header.store_name}</span>
                <span className="text-dracula-text/60"> • </span>
                {header.store_address}
              </p>
              <p className="mt-3 text-xs text-dracula-text/70">
                Leve seu aparelho até o endereço acima e informe o <span className="font-semibold">código</span> do pedido.
              </p>
            </Card>

            <Card>
              <div className="text-sm font-semibold text-dracula-text">Chat</div>
              {!chatAllowed(header.status) ? (
                <p className="mt-2 text-sm text-dracula-text/70">
                  O chat ficará disponível quando a assistência iniciar o atendimento (status: Em andamento).
                </p>
              ) : (
                <>
                  {msgError ? <p className="mt-2 text-sm text-dracula-accent2">{msgError}</p> : null}

                  <div
                    ref={chatScrollRef}
                    className="mt-3 max-h-[320px] overflow-auto rounded-xl bg-black/15 p-3 ring-1 ring-white/10"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] text-dracula-text/55">
                        Tempo real: {rtStatus === "online" ? "online" : rtStatus === "connecting" ? "conectando" : "offline"}
                      </span>
                      <button
                        type="button"
                        onClick={loadMessages}
                        className="text-[11px] font-semibold text-dracula-accent hover:brightness-95"
                      >
                        Atualizar
                      </button>
                    </div>
                    {msgLoading ? (
                      <p className="text-sm text-dracula-text/70">Carregando mensagens…</p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-dracula-text/70">Nenhuma mensagem ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {messages.map((m) => (
                          <div
                            key={m.id}
                            className={
                              m.sender_type === "customer"
                                ? "ml-auto w-fit max-w-[85%] rounded-xl bg-white/10 px-3 py-2 text-sm text-dracula-text ring-1 ring-white/10"
                                : "mr-auto w-fit max-w-[85%] rounded-xl bg-black/30 px-3 py-2 text-sm text-dracula-text ring-1 ring-white/10"
                            }
                          >
                            <div className="whitespace-pre-wrap leading-relaxed">{m.message}</div>
                            <div className="mt-1 text-[10px] text-dracula-text/55">{formatDateBR(m.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <input
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Escreva uma mensagem…"
                      className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-dracula-text ring-1 ring-white/10 outline-none placeholder:text-dracula-text/40 focus:ring-dracula-accent"
                    />
                    <button
                      type="button"
                      onClick={onSend}
                      disabled={sending || !draft.trim()}
                      className="rounded-xl bg-dracula-accent px-4 py-2 text-sm font-semibold text-dracula-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Enviar
                    </button>
                  </div>
                </>
              )}
            </Card>
          </>
        ) : null}

        <Link href="/meus-pedidos" className="inline-flex text-sm font-semibold text-dracula-accent hover:brightness-95">
          ← Voltar para Meus Pedidos
        </Link>
      </div>
    </ClientShell>
  );
}
