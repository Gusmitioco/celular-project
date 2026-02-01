"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ClientShell } from "@/components/layout/ClientShell";
import { Card } from "@/components/ui/Card";
import { api } from "@/services/api";
import { useAuth } from "@/components/auth/AuthProvider";

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
      await loadMessages();
    } catch {
      setMsgError("Não foi possível enviar a mensagem agora.");
    } finally {
      setSending(false);
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
                className="rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20] glass-fix transition hover:bg-white/[0.18]"
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
                      <span className="text-sm text-dracula-text">{it.service_name}</span>
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

                  <div className="mt-3 max-h-[320px] overflow-auto rounded-xl bg-black/15 p-3 ring-1 ring-white/10">
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
