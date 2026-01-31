"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { Socket } from "socket.io-client";
import { apiBaseUrl } from "@/services/api";

type ThreadRow = {
  id: number;
  code: string;
  status: "in_progress" | "done" | "cancelled";
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
};

type InboxResp = { ok: true; rows: ThreadRow[]; hasMore?: boolean; limit?: number; offset?: number };

type MessageRow = {
  id: number;
  sender_type: string;
  sender_id: number | null;
  message: string;
  created_at: string;
};

type MessagesResp = { ok: true; rows: MessageRow[] };

function statusLabel(s: ThreadRow["status"]) {
  if (s === "in_progress") return "Em andamento";
  if (s === "done") return "Concluído";
  return "Cancelado";
}

export function StoreInboxClient() {
  const api = apiBaseUrl;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [rtStatus, setRtStatus] = useState<"connecting" | "online" | "offline">("offline");

  // Inbox supports: all | in_progress | done | cancelled
  const [status, setStatus] = useState<"all" | "in_progress" | "done" | "cancelled">("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");

  const [rows, setRows] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const PAGE_LIMIT = 200;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [selectedCode, setSelectedCode] = useState<string>("");

  // virtual list (left column) to keep UI fast even with many threads
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);

  // Make virtualization height match the actual panel height
  const [listHeight, setListHeight] = useState(520);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const update = () => {
      const h = el.clientHeight;
      if (h && h !== listHeight) setListHeight(h);
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // chat
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatErr, setChatErr] = useState<string | null>(null);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selectedThread = useMemo(
    () => rows.find((r) => r.code === selectedCode) ?? null,
    [rows, selectedCode]
  );

  // debounce search input so we don't fetch on every key stroke
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const queryKey = useMemo(() => {
    const sp = new URLSearchParams();
    sp.set("status", status);
    if (q.trim()) sp.set("q", q.trim());
    return sp.toString();
  }, [status, q]);

  const ITEM_H = 112;
  const overscan = 6;

  const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_H) - Math.floor(overscan / 2));
  const visibleCount = Math.ceil(listHeight / ITEM_H) + overscan;
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const visibleRows = rows.slice(startIndex, endIndex);
  const topSpacer = startIndex * ITEM_H;
  const bottomSpacer = (rows.length - endIndex) * ITEM_H;

  // Infinite scroll: load more threads as the user approaches the end of the list
  useEffect(() => {
    if (!hasMore) return;
    if (loading || loadingMore) return;

    const totalHeight = rows.length * ITEM_H;
    const nearBottom = scrollTop + listHeight >= totalHeight - 300;
    if (!nearBottom) return;

    loadInbox(undefined, { silent: true, append: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTop, rows.length, hasMore, loading, loadingMore, queryKey, listHeight]);

  async function loadInbox(signal?: AbortSignal, opts?: { silent?: boolean; append?: boolean }) {
    if (!api) {
      setErr("NEXT_PUBLIC_API_URL não definido");
      return;
    }

    const append = Boolean(opts?.append);
    const nextOffset = append ? offset : 0;

    // when filters/search change, reset paging
    if (!append) {
      setOffset(0);
      setHasMore(true);
    }

    if (append) setLoadingMore(true);
    if (!opts?.silent && !append) setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${api}/api/store/inbox?${queryKey}&limit=${PAGE_LIMIT}&offset=${nextOffset}`, {
        credentials: "include",
        cache: "no-store",
        signal,
      });

      const json = (await res.json().catch(() => null)) as InboxResp | any;

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        if (!append) setRows([]);
        setErr(json?.error ?? "Erro ao carregar inbox");
        return;
      }

      const newRows: ThreadRow[] = json.rows ?? [];
      const more = Boolean(json.hasMore ?? newRows.length === PAGE_LIMIT);
      setHasMore(more);

      if (append) {
        setRows((prev) => {
          // merge by id (avoid duplicates if realtime updates cause overlaps)
          const seen = new Set(prev.map((p) => p.id));
          const out = [...prev];
          for (const r of newRows) {
            if (!seen.has(r.id)) out.push(r);
          }
          return out;
        });
        setOffset(nextOffset + newRows.length);
        return;
      }

      setRows(newRows);
      setOffset(nextOffset + newRows.length);

      // auto-select first only if nothing selected yet
      if (!selectedCode) {
        setSelectedCode(newRows[0]?.code ?? "");
        setMessages([]);
      }

      // if selection disappeared due to filter/search, clear it
      if (selectedCode && !newRows.some((r) => r.code === selectedCode)) {
        setSelectedCode("");
        setMessages([]);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        if (!append) setRows([]);
        setErr(String(e?.message ?? "Erro inesperado"));
      }
    } finally {
      setLoadingMore(false);
      if (!opts?.silent && !append) setLoading(false);
    }
  }

  async function markAsRead(requestId: number, lastReadMessageId: number) {
    if (!api) return;

    await fetch(`${api}/api/store/inbox/${requestId}/read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ lastReadMessageId }),
    }).catch(() => null);
  }

  async function loadMessages(requestId: number, signal?: AbortSignal) {
    if (!api) {
      setChatErr("NEXT_PUBLIC_API_URL não definido");
      return;
    }

    setChatLoading(true);
    setChatErr(null);

    try {
      const res = await fetch(`${api}/api/store/requests/${requestId}/messages`, {
        credentials: "include",
        cache: "no-store",
        signal,
      });

      const json = (await res.json().catch(() => null)) as MessagesResp | any;

      if (res.status === 401) {
        window.location.href = "/store/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        // NOTE: backend may return 403 chat_locked if status is not allowed
        setChatErr(json?.error ?? "Erro ao carregar mensagens");
        return;
      }

      const newMsgs: MessageRow[] = json.rows ?? [];
      setMessages(newMsgs);

      // mark read up to last message we have
      const lastId = newMsgs.length ? newMsgs[newMsgs.length - 1].id : 0;
      if (lastId > 0) {
        await markAsRead(requestId, lastId);
        // clear badge locally
        setRows((prev) => prev.map((r) => (r.id === requestId ? { ...r, unread_count: 0 } : r)));
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setChatErr(String(e?.message ?? "Erro inesperado"));
    } finally {
      setChatLoading(false);
    }
  }

  async function sendMessage(requestId: number) {
    if (!api) {
      setChatErr("NEXT_PUBLIC_API_URL não definido");
      return;
    }

    const m = text.trim();
    if (!m) return;

    setChatErr(null);

    // Prefer realtime send via Socket.IO (falls back to HTTP)
    if (socket && socket.connected) {
      setText("");
      socket.emit("message:send", { requestId, message: m }, (ack: any) => {
        if (!ack?.ok) {
          setChatErr(ack?.error ?? "Erro ao enviar mensagem");
        }
      });
      return;
    }

    const res = await fetch(`${api}/api/store/requests/${requestId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ message: m }),
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

    setText("");
    await loadMessages(requestId);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  // initial load + whenever filters/search change
  useEffect(() => {
    const ac = new AbortController();
    loadInbox(ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  // Real-time socket connection
  useEffect(() => {
    if (!api) return;
    setRtStatus("connecting");

    const s = getSocket(api);
    setSocket(s);

    const onConnect = () => setRtStatus("online");
    const onDisconnect = () => setRtStatus("offline");
    const onConnectErr = () => setRtStatus("offline");

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onConnectErr);

    // If already connected (hot reload), update status
    if (s.connected) setRtStatus("online");

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onConnectErr);
    };
  }, [api]);

  // when selecting a thread, load messages
  useEffect(() => {
    if (!selectedThread) return;

    const requestId = Number(selectedThread.id);
    if (!Number.isFinite(requestId)) return;

    const ac = new AbortController();
    loadMessages(requestId, ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThread?.id]);

  // Join/leave realtime room when selection changes
  useEffect(() => {
    if (!socket || !selectedThread) return;
    const requestId = Number(selectedThread.id);
    if (!Number.isFinite(requestId)) return;

    socket.emit("request:join", { requestId }, (ack: any) => {
      if (ack?.ok === false && ack?.error === "not_authenticated") {
        window.location.href = "/store/login";
      }
    });

    return () => {
      socket.emit("request:leave", { requestId });
    };
  }, [socket, selectedThread?.id]);

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    const onNew = async (msg: any) => {
      const requestId = Number(msg?.request_id);
      const msgId = Number(msg?.id);
      if (!Number.isFinite(requestId) || !Number.isFinite(msgId)) return;

      // Update inbox preview + reorder
      setRows((prev) => {
        const idx = prev.findIndex((r) => r.id === requestId);
        if (idx === -1) return prev;
        const isActive = selectedThread?.id === requestId;
        const next = [...prev];
        const row = { ...next[idx] };
        row.last_message_id = msgId;
        row.last_message_text = String(msg?.message ?? "");
        row.last_message_at = String(msg?.created_at ?? new Date().toISOString());
        row.last_message_sender = String(msg?.sender_type ?? "");
        if (String(msg?.sender_type) === "customer") {
          row.unread_count = isActive ? 0 : (row.unread_count ?? 0) + 1;
        }
        next.splice(idx, 1);
        return [row, ...next];
      });

      // Update message list if active thread
      if (selectedThread?.id === requestId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msgId)) return prev;
          return [...prev, msg as MessageRow];
        });

        // Mark read if customer message
        if (String(msg?.sender_type) === "customer") {
          await markAsRead(requestId, msgId);
        }
      }
    };

    socket.on("message:new", onNew);
    return () => {
      socket.off("message:new", onNew);
    };
  }, [socket, selectedThread?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div
      className="surface"
      style={{
        padding: 0,
        overflow: "hidden",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: 12,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="btnRow">
          <Link className="btn" href="/store">
            ← Dashboard
          </Link>

          <button
            className="btn"
            type="button"
            disabled={!selectedThread}
            onClick={() => selectedThread && (window.location.href = `/store/requests/${selectedThread.code}`)}
          >
            Abrir página do código
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="cardMeta">
            {rtStatus === "online" ? "● Tempo real" : rtStatus === "connecting" ? "● Conectando..." : "● Offline"}
          </span>
          <button className="btn" type="button" onClick={() => loadInbox()} disabled={loading}>
            Atualizar
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left */}
        <div
          style={{
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
            <div className="btnRow" style={{ flexWrap: "wrap" }}>
              <button
                className={`btn ${status === "all" ? "btnPrimary" : ""}`}
                type="button"
                onClick={() => setStatus("all")}
              >
                Todos
              </button>
              <button
                className={`btn ${status === "in_progress" ? "btnPrimary" : ""}`}
                type="button"
                onClick={() => setStatus("in_progress")}
              >
                Andamento
              </button>
              <button className={`btn ${status === "done" ? "btnPrimary" : ""}`} type="button" onClick={() => setStatus("done")}>
                Concluído
              </button>

              <button
                className={`btn ${status === "cancelled" ? "btnPrimary" : ""}`}
                type="button"
                onClick={() => setStatus("cancelled")}
              >
                Cancelado
              </button>
            </div>

            <input
              className="input"
              style={{ marginTop: 10 }}
              placeholder="Buscar por código ou cliente..."
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
            />
          </div>

          <div
            ref={listRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
            }}
            onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
          >
            {loading ? (
              <div style={{ padding: 12 }} className="cardMeta">
                Carregando...
              </div>
            ) : err ? (
              <div style={{ padding: 12, fontWeight: 900 }}>{err}</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 12 }} className="cardMeta">
                Nenhuma conversa disponível ainda.
              </div>
            ) : (
              <div style={{ paddingTop: topSpacer, paddingBottom: bottomSpacer }}>
                {visibleRows.map((r) => {
                  const active = r.code === selectedCode;
                  const hasUnread = r.unread_count > 0;

                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedCode(r.code)}
                      style={{
                        height: ITEM_H,
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        // Avoid light backgrounds that would clash with the dark theme (text becomes unreadable).
                        background: active ? "var(--card)" : hasUnread ? "rgba(255, 255, 255, 0.08)" : "transparent",
                        borderBottom: "1px solid var(--border)",
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                        <div style={{ fontWeight: hasUnread ? 900 : 800 }}>{r.customer_name}</div>
                        {hasUnread ? <span style={{ fontSize: 12, fontWeight: 900 }}>● {r.unread_count}</span> : null}
                      </div>

                      <div className="cardMeta">
                        {r.code} • {r.model_name}
                      </div>

                      <div className="cardMeta" style={{ marginTop: 6 }}>
                        {statusLabel(r.status)} • {new Date(r.created_at).toLocaleString("pt-BR")}
                      </div>

                      <div className="cardMeta" style={{ marginTop: 6 }}>
                        <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.last_message_text ? r.last_message_text : "Sem mensagens ainda"}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {loadingMore ? (
                  <div style={{ padding: 12 }} className="cardMeta">
                    Carregando mais...
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          {!selectedThread ? (
            <div style={{ padding: 16 }} className="cardMeta">
              Selecione uma conversa na lista.
            </div>
          ) : (
            <>
              {/* Header */}
              <div
                style={{
                  padding: 14,
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {selectedThread.customer_name} • {selectedThread.code}
                  </div>
                  <div className="cardMeta">
                    {selectedThread.model_name} • {statusLabel(selectedThread.status)}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div className="cardMeta">Total</div>
                  <div style={{ fontWeight: 900 }}>
                    R$ {(selectedThread.total_cents / 100).toFixed(2).replace(".", ",")}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                style={{
                  padding: 14,
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  background: "transparent",
                }}
              >
                {chatErr && <div style={{ fontWeight: 900, marginBottom: 10 }}>{chatErr}</div>}

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
                              // Keep both sides readable in the dark theme.
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
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <div style={{ padding: 14, borderTop: "1px solid var(--border)" }}>
                <textarea
                  className="input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Digite uma mensagem..."
                  rows={3}
                />
                <div className="btnRow" style={{ justifyContent: "flex-end", marginTop: 10 }}>
                  <button className="btn btnPrimary" type="button" onClick={() => sendMessage(selectedThread.id)}>
                    Enviar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
