"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type Store = { id: number; name: string; city: string };
type Brand = { id: number; name: string };
type Model = { id: number; name: string; brand_id: number };

type Row = {
  id: number;
  label: string;
  active: boolean;
  price_cents: number;
  last_price_cents: number;
};

function toPriceStringFromCents(cents: number): string {
  if (!Number.isFinite(cents) || cents <= 0) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function centsFromInput(v: string): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function AdminScreenPricesClient() {
  const api = apiBaseUrl;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stores, setStores] = useState<Store[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [storeId, setStoreId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [modelId, setModelId] = useState<number | "">("");

  const filteredModels = useMemo(() => {
    if (!brandId) return models;
    return models.filter((m) => m.brand_id === Number(brandId));
  }, [models, brandId]);

  const [rows, setRows] = useState<Row[]>([]);
  const [draftPrice, setDraftPrice] = useState<Record<number, string>>({});
  const [draftAvailable, setDraftAvailable] = useState<Record<number, boolean>>({});
  const [draftLast, setDraftLast] = useState<Record<number, number>>({});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(`${api}/api/admin/screen-prices/meta`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j?.ok) throw new Error(j?.error || "Falha ao carregar meta");
        setStores(j.stores || []);
        setBrands(j.brands || []);
        setModels(j.models || []);
      })
      .catch((e: any) => alive && setError(e?.message || "Erro"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [api]);

  async function loadRows(nextStoreId: number, nextModelId: number) {
    setError(null);
    const j = await fetch(
      `${api}/api/admin/screen-prices?storeId=${encodeURIComponent(String(nextStoreId))}&modelId=${encodeURIComponent(
        String(nextModelId)
      )}`,
      { credentials: "include" }
    ).then((r) => r.json());
    if (!j?.ok) throw new Error(j?.error || "Falha ao carregar telas");

    const list: Row[] = (j.rows || []).map((x: any) => ({
      id: Number(x.screen_option_id ?? x.id),
      label: String(x.label ?? ""),
      active: Boolean(x.active),
      price_cents: Number(x.price_cents ?? 0),
      last_price_cents: Number(x.last_price_cents ?? 0),
    }));

    setRows(list);

    const p: Record<number, string> = {};
    const a: Record<number, boolean> = {};
    const l: Record<number, number> = {};
    for (const r of list) {
      a[r.id] = r.price_cents > 0;
      l[r.id] = r.last_price_cents || (r.price_cents > 0 ? r.price_cents : 0);
      p[r.id] = r.price_cents > 0 ? toPriceStringFromCents(r.price_cents) : "";
    }
    setDraftAvailable(a);
    setDraftLast(l);
    setDraftPrice(p);
  }

  useEffect(() => {
    if (!storeId || !modelId) return;
    loadRows(Number(storeId), Number(modelId)).catch((e: any) => setError(e?.message || "Erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, modelId]);

  function onToggle(id: number, next: boolean) {
    setDraftAvailable((prev) => ({ ...prev, [id]: next }));
    if (!next) return;

    // When enabling, DO NOT auto-fill a value.
    // If they already have a draft value, keep it; otherwise keep empty and force user to input.
    setDraftPrice((prev) => ({ ...prev, [id]: prev[id] ?? "" }));
  }

  async function saveAll() {
    if (!storeId || !modelId) return;

    // Frontend validation: toggle ON requires price > 0
    for (const r of rows) {
      const available = !!draftAvailable[r.id];
      if (!available) continue;
      const cents = centsFromInput(draftPrice[r.id] ?? "");
      if (cents == null || cents <= 0) {
        setError(`Defina um preço válido para: ${r.label}`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const items = rows.map((r) => {
        const available = !!draftAvailable[r.id];
        const cents = centsFromInput(draftPrice[r.id] ?? "");
        return {
          screenOptionId: r.id,
          available,
          priceCents: available ? Number(cents ?? 0) : 0,
        };
      });

      const j = await fetch(`${api}/api/admin/screen-prices/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId: Number(storeId), modelId: Number(modelId), items }),
      }).then((r) => r.json());
      if (!j?.ok) throw new Error(j?.error || "Falha ao salvar");

      await loadRows(Number(storeId), Number(modelId));
    } catch (e: any) {
      setError(e?.message || "Erro");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="sub">Carregando...</div>;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      {error ? (
        <div className="warn" style={{ marginBottom: 10 }}>
          {error}
        </div>
      ) : null}

      <div className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ minWidth: 260 }}>
          <div className="label">Loja</div>
          <select
            className="input"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value ? Number(e.target.value) : "");
              setRows([]);
              setDraftAvailable({});
              setDraftPrice({});
              setDraftLast({});
            }}
          >
            <option value="">Selecione</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.city} — {s.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 220 }}>
          <div className="label">Marca</div>
          <select
            className="input"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value ? Number(e.target.value) : "");
              setModelId("");
              setRows([]);
            }}
          >
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: 260 }}>
          <div className="label">Modelo</div>
          <select
            className="input"
            value={modelId}
            onChange={(e) => {
              setModelId(e.target.value ? Number(e.target.value) : "");
              setRows([]);
            }}
          >
            <option value="">Selecione</option>
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
          <button
            className="btn"
            disabled={!storeId || !modelId || saving}
            onClick={() =>
              storeId && modelId &&
              loadRows(Number(storeId), Number(modelId)).catch((e: any) => setError(e?.message || "Erro"))
            }
          >
            Recarregar
          </button>
          <button className="btn primary" disabled={!storeId || !modelId || saving} onClick={saveAll}>
            {saving ? "Salvando..." : "Salvar tudo"}
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Tela</th>
              <th style={{ width: 130, textAlign: "center" }}>Disponível</th>
              <th style={{ width: 200 }}>Preço (R$)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="sub" style={{ padding: 12 }}>
                  Selecione loja e modelo para carregar as telas.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const available = !!draftAvailable[r.id];
                const disabled = !available;
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                      {!r.active ? <div className="sub">(opção desativada no catálogo)</div> : null}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" checked={available} onChange={(e) => onToggle(r.id, e.target.checked)} />
                    </td>
                    <td>
                      <input
                        className="input"
                        placeholder={available ? "Ex: 169,99" : "Indisponível"}
                        disabled={disabled}
                        value={draftPrice[r.id] ?? ""}
                        onChange={(e) => setDraftPrice((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <div className="sub" style={{ marginTop: 4 }}>
                        {available ? "Obrigatório" : "Preço 0 (indisponível)"}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
