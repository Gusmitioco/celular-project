"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type Brand = { id: number; name: string };
type Model = { id: number; name: string; brand_id: number };

type Row = {
  id: number; // ✅ volta a ser number (é o que o backend espera no bulk)
  label: string;
  admin_price_cents: number;
  store_price_cents: number | null;
};

function centsFromInput(v: string): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function formatCentsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatCentsToText(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function uniqById(list: Row[]): Row[] {
  const seen = new Set<number>();
  const out: Row[] = [];
  for (const r of list) {
    if (!Number.isFinite(r.id)) continue;
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
}

export function StoreScreenPricesClient() {
  const api = apiBaseUrl;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [brandId, setBrandId] = useState<number | "">("");
  const [modelId, setModelId] = useState<number | "">("");

  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<number, string>>({});

  const filteredModels = useMemo(() => {
    if (!brandId) return models;
    return models.filter((m) => m.brand_id === Number(brandId));
  }, [models, brandId]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    fetch(`${api}/api/store/screen-prices/meta`, { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (!j?.ok) throw new Error(j?.error || "Falha ao carregar meta");
        setBrands(j.brands || []);
        setModels(j.models || []);
      })
      .catch((e: any) => alive && setError(e?.message || "Erro"))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [api]);

  async function loadRows(nextModelId: number) {
    setError(null);

    const j = await fetch(`${api}/api/store/screen-prices?modelId=${encodeURIComponent(String(nextModelId))}`, {
      credentials: "include",
    }).then((r) => r.json());

    if (!j?.ok) throw new Error(j?.error || "Falha ao carregar opções");

    const raw = Array.isArray(j.rows) ? j.rows : [];

    // ✅ pega o id certo: screen_option_id (fallback: id)
    const parsed: Row[] = raw
      .map((x: any) => {
        const idNum = Number(x?.screen_option_id ?? x?.id);
        if (!Number.isFinite(idNum)) return null;

        const adminCents = Number(x?.admin_price_cents ?? 0);
        const storeCents = x?.store_price_cents == null ? null : Number(x.store_price_cents);

        return {
          id: idNum,
          label: String(x?.label ?? ""),
          admin_price_cents: Number.isFinite(adminCents) ? adminCents : 0,
          store_price_cents: storeCents != null && Number.isFinite(storeCents) ? storeCents : null,
        } as Row;
      })
      .filter(Boolean) as Row[];

    const list = uniqById(parsed);

    setRows(list);

    const d: Record<number, string> = {};
    for (const r of list) d[r.id] = formatCentsToInput(r.store_price_cents);
    setDraft(d);
  }

  useEffect(() => {
    if (!modelId) return;
    loadRows(Number(modelId)).catch((e: any) => setError(e?.message || "Erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  async function saveAll() {
    if (!modelId) return;

    setSaving(true);
    setError(null);

    try {
      const items = Object.entries(draft).map(([id, v]) => ({
        screenOptionId: Number(id),
        priceCents: centsFromInput(v),
      }));

      const j = await fetch(`${api}/api/store/screen-prices/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: Number(modelId), items }),
      }).then((r) => r.json());

      if (!j?.ok) throw new Error(j?.error || "Falha ao salvar");

      await loadRows(Number(modelId));
    } catch (e: any) {
      setError(e?.message || "Erro");
    } finally {
      setSaving(false);
    }
  }

  const canAct = !!modelId && !saving;

  if (loading) return <div className="sub">Carregando...</div>;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      {error ? (
        <div className="warn" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 1fr) minmax(260px, 1.2fr) auto",
          gap: 12,
          alignItems: "end",
        }}
      >
        <div>
          <div className="label">Marca</div>
          <select
            className="input"
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value ? Number(e.target.value) : "");
              setModelId("");
              setRows([]);
              setDraft({});
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

        <div>
          <div className="label">Modelo</div>
          <select
            className="input"
            value={modelId}
            onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Selecione</option>
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 240 }}>
          <div className="label" style={{ opacity: 0, userSelect: "none" }}>
            Ações
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              className="btn"
              disabled={!canAct}
              onClick={() => modelId && loadRows(Number(modelId)).catch((e) => setError(String(e?.message || e)))}
            >
              Recarregar
            </button>
            <button className="btn primary" disabled={!canAct} onClick={saveAll}>
              {saving ? "Salvando..." : "Salvar tudo"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Tela</th>
              <th style={{ width: 240, textAlign: "left", padding: "10px 12px" }}>Preço loja (R$)</th>
              <th style={{ width: 180, textAlign: "left", padding: "10px 12px" }}>Padrão admin</th>
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: "12px", opacity: 0.85 }}>
                  <span className="sub">Selecione um modelo para ver as opções.</span>
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const v = draft[r.id] ?? "";
                const usingDefault = !v;

                return (
                  <tr key={`screenopt-${r.id}`} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: "12px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600 }}>{r.label}</div>
                    </td>

                    <td style={{ padding: "12px", verticalAlign: "top" }}>
                      <div style={{ maxWidth: 220 }}>
                        <input
                          className="input"
                          placeholder="(usar padrão)"
                          value={v}
                          inputMode="decimal"
                          onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        />
                        <div className="sub" style={{ marginTop: 6 }}>
                          {usingDefault ? "Usando padrão" : "Override"}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "12px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600 }}>{formatCentsToText(r.admin_price_cents)}</div>
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
