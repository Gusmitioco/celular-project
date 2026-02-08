"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type Brand = { id: number; name: string };
type Model = { id: number; name: string; brand_id: number };
type Row = { id: number; label: string; active: boolean; price_cents: number };

function formatBRLFromCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function AdminScreenOptionsClient() {
  const api = apiBaseUrl;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [brandId, setBrandId] = useState<number | "">("");
  const [modelId, setModelId] = useState<number | "">("");

  const filteredModels = useMemo(() => {
    if (!brandId) return models;
    return models.filter((m) => m.brand_id === Number(brandId));
  }, [models, brandId]);

  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Record<number, { label: string; price_cents: number; active: boolean }>>({});

  const [newLabel, setNewLabel] = useState("");
  const [newPrice, setNewPrice] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch(`${api}/api/admin/screen-options/meta`, { credentials: "include" })
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
    const j = await fetch(`${api}/api/admin/screen-options?modelId=${encodeURIComponent(String(nextModelId))}`, {
      credentials: "include",
    }).then((r) => r.json());
    if (!j?.ok) throw new Error(j?.error || "Falha ao carregar opções");
    const list: Row[] = (j.rows || []).map((x: any) => ({
      id: Number(x.id),
      label: String(x.label),
      active: Boolean(x.active),
      price_cents: Number(x.price_cents),
    }));
    setRows(list);
    const d: Record<number, { label: string; price_cents: number; active: boolean }> = {};
    for (const r of list) d[r.id] = { label: r.label, price_cents: r.price_cents, active: r.active };
    setDraft(d);
  }

  useEffect(() => {
    if (!modelId) return;
    loadRows(Number(modelId)).catch((e: any) => setError(e?.message || "Erro"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  async function addOption() {
    if (!modelId) return;
    const label = newLabel.trim();
    const price = Number(String(newPrice).replace(",", "."));
    if (!label) return setError("Digite o nome/descrição da tela");
    if (!Number.isFinite(price) || price < 0) return setError("Preço inválido");
    setSaving(true);
    setError(null);
    try {
      const j = await fetch(`${api}/api/admin/screen-options`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: Number(modelId), label, priceCents: Math.round(price * 100) }),
      }).then((r) => r.json());
      if (!j?.ok) throw new Error(j?.error || "Falha ao criar");
      setNewLabel("");
      setNewPrice("");
      await loadRows(Number(modelId));
    } catch (e: any) {
      setError(e?.message || "Erro");
    } finally {
      setSaving(false);
    }
  }

  async function saveAll() {
    if (!modelId) return;
    setSaving(true);
    setError(null);
    try {
      const items = Object.entries(draft).map(([id, v]) => ({
        id: Number(id),
        label: v.label,
        priceCents: Number(v.price_cents),
        active: Boolean(v.active),
      }));
      const j = await fetch(`${api}/api/admin/screen-options/bulk`, {
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

  if (loading) return <div className="sub">Carregando...</div>;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      {error ? (
        <div className="warn" style={{ marginBottom: 10 }}>
          {error}
        </div>
      ) : null}

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ minWidth: 220 }}>
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

        <div style={{ minWidth: 260 }}>
          <div className="label">Modelo</div>
          <select className="input" value={modelId} onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Selecione</option>
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <button className="btn" disabled={!modelId || saving} onClick={() => modelId && loadRows(Number(modelId)).catch((e) => setError(String(e?.message || e)))}>
            Recarregar
          </button>
          <button className="btn primary" disabled={!modelId || saving} onClick={saveAll}>
            {saving ? "Salvando..." : "Salvar tudo"}
          </button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="label">Nova opção de tela</div>
          <input className="input" placeholder="Ex: IMPORTADA LCD VD (PRETO/BRANCO)" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        </div>
        <div style={{ width: 180 }}>
          <div className="label">Preço (R$)</div>
          <input className="input" placeholder="Ex: 169,99" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button className="btn" disabled={!modelId || saving} onClick={addOption}>
            Adicionar
          </button>
        </div>
      </div>

      <div style={{ height: 14 }} />

      <div style={{ overflowX: "auto" }}>
        <table className="table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Tela</th>
              <th style={{ width: 150 }}>Preço</th>
              <th style={{ width: 110 }}>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const d = draft[r.id] || { label: r.label, price_cents: r.price_cents, active: r.active };
              return (
                <tr key={r.id}>
                  <td>
                    <input
                      className="input"
                      value={d.label}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: { ...d, label: e.target.value } }))}
                    />
                  </td>
                  <td>
                    <input
                      className="input"
                      value={(d.price_cents / 100).toFixed(2).replace(".", ",")}
                      onChange={(e) => {
                        const num = Number(String(e.target.value).replace(",", "."));
                        const cents = Number.isFinite(num) ? Math.round(num * 100) : 0;
                        setDraft((prev) => ({ ...prev, [r.id]: { ...d, price_cents: cents } }));
                      }}
                    />
                    <div className="sub" style={{ marginTop: 4 }}>{formatBRLFromCents(d.price_cents)}</div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!d.active}
                      onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: { ...d, active: e.target.checked } }))}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
