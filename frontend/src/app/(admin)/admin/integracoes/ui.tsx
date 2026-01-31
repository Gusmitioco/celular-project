"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type StoreRow = {
  id: number;
  name: string;
  city: string;
  address: string;
  sync_enabled: boolean;
  sync_webhook_url: string | null;
};

type Integration = {
  id: number;
  sync_enabled: boolean;
  sync_webhook_url: string | null;
  sync_hmac_secret: string | null;
};

export function AdminIntegracoesClient() {
  const api = apiBaseUrl;

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedId) ?? null,
    [stores, selectedId]
  );

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [syncEnabled, setSyncEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [secret, setSecret] = useState("");

  async function loadStores() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`${api}/api/admin/stores`, { credentials: "include" });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao carregar lojas");
      setLoading(false);
      return;
    }

    setStores(data.stores);
    setSelectedId((prev) => prev ?? data.stores?.[0]?.id ?? null);
    setLoading(false);
  }

    async function testWebhook() {
      if (!selectedId) return;
      setMsg(null);

      const res = await fetch(`${api}/api/admin/stores/${selectedId}/integration/test`, {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setMsg(data?.message ?? data?.error ?? "Erro ao testar webhook");
        return;
      }

      setMsg(`Teste OK ✅ (HTTP ${data.httpStatus})`);
    }
  
  async function loadIntegration(storeId: number) {
    setMsg(null);

    const res = await fetch(`${api}/api/admin/stores/${storeId}/integration`, { credentials: "include" });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao carregar integração");
      return;
    }

    const cfg: Integration = data.store;
    setSyncEnabled(Boolean(cfg.sync_enabled));
    setWebhookUrl(cfg.sync_webhook_url ?? "");
    setSecret(cfg.sync_hmac_secret ?? "");
  }

  async function saveIntegration() {
    if (!selectedId) return;

    setMsg(null);

    const res = await fetch(`${api}/api/admin/stores/${selectedId}/integration`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        sync_enabled: syncEnabled,
        sync_webhook_url: webhookUrl.trim(),
        sync_hmac_secret: secret.trim(),
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao salvar");
      return;
    }

    setMsg("Salvo ✅");
    await loadStores();
  }

  useEffect(() => {
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedId) loadIntegration(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (loading) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        Carregando...
      </div>
    );
  }

  return (
    <div className="surface" style={{ padding: 16 }}>
      {msg && (
        <div style={{ marginBottom: 12, fontWeight: 700 }}>
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        {/* Left: store list */}
        <div>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Lojas</div>
          <div className="grid" style={{ gap: 8 }}>
            {stores.map((s) => (
              <button
                key={s.id}
                type="button"
                className="btn"
                style={{
                  justifyContent: "space-between",
                  width: "100%",
                  fontWeight: selectedId === s.id ? 900 : 700,
                }}
                onClick={() => setSelectedId(s.id)}
              >
                <span>{s.name}</span>
                <span style={{ opacity: 0.8 }}>
                  {s.sync_enabled ? "✅" : "—"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: config */}
        <div>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>
            Configuração {selectedStore ? `— ${selectedStore.name}` : ""}
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
            <input
              type="checkbox"
              checked={syncEnabled}
              onChange={(e) => setSyncEnabled(e.target.checked)}
            />
            <span>Ativar sincronização para esta loja</span>
          </label>

          <div style={{ display: "grid", gap: 10 }}>
            <label>
              <div className="cardMeta">Webhook URL</div>
              <input
                className="input"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://exemplo.com/webhook"
              />
            </label>

            <label>
              <div className="cardMeta">HMAC Secret</div>
              <input
                className="input"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="uma-chave-secreta"
              />
            </label>

            <div className="btnRow" style={{ marginTop: 8 }}>
              <button className="btn" type="button" onClick={testWebhook}>
                Testar webhook
              </button>
              <button className="btn btnPrimary" type="button" onClick={saveIntegration}>
                Salvar
              </button>
            </div>
          </div>

          <div className="cardMeta" style={{ marginTop: 12 }}>
            Dica: se você ativar, o Webhook URL e Secret são obrigatórios. O botão “Sincronizar”
            em “Meus Serviços” vai usar esta configuração da loja.
          </div>
        </div>
      </div>
    </div>
  );
}
