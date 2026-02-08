"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type Brand = { id: number; name: string };
type Model = { id: number; name: string; brand_id: number };
type Row = { id: number; label: string; active: boolean };

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
  const [draft, setDraft] = useState<Record<number, Row>>({});
  const [newLabel, setNewLabel] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
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
      label: String(x.label ?? ""),
      active: Boolean(x.active),
    }));
    setRows(list);
    const d: Record<number, Row> = {};
    for (const r of list) d[r.id] = { ...r };
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
    if (!label) return setError("Digite o nome/descrição da tela");

    setSaving(true);
    setError(null);
    try {
      const j = await fetch(`${api}/api/admin/screen-options`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: Number(modelId), label, active: true }),
      }).then((r) => r.json());
      if (!j?.ok) throw new Error(j?.error || "Falha ao criar");
      setNewLabel("");
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
        label: String(v.label ?? "").trim(),
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
          <select className="input" value={modelId} onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Selecione</option>
            {filteredModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <button
            className="btn"
            disabled={!modelId || saving}
            onClick={() => modelId && loadRows(Number(modelId)).catch((e) => setError(String(e?.message || e)))}
          >
            Recarregar
          </button>
          <button className="btn primary" disabled={!modelId || saving} onClick={saveAll}>
            {saving ? "Salvando..." : "Salvar tudo"}
          </button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="label">Nova opção de tela</div>
          <input
            className="input"
            placeholder="Ex: IMPORTADA LCD VD (PRETO/BRANCO)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
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
              <th style={{ width: 110, textAlign: "center" }}>Ativo</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="sub" style={{ padding: 12 }}>
                  Selecione um modelo para ver as opções.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const d = draft[r.id] || r;
                return (
                  <tr key={r.id}>
                    <td>
                      <input
                        className="input"
                        value={d.label}
                        onChange={(e) => setDraft((prev) => ({ ...prev, [r.id]: { ...d, label: e.target.value } }))}
                      />
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
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="sub" style={{ marginTop: 10 }}>
        Preços de telas são configurados por loja em <b>Admin → Preços de tela</b> ou pela própria loja.
      </div>
    </div>
  );
}
