"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type Brand = { id: number; name: string };
type Model = { id: number; name: string; brand_id: number };
type ScreenRow = { id: number; label: string; active: boolean };

type MetaResp = { ok: true; brands: Brand[]; models: Model[] } | { ok: false; error?: string };
type ListResp = { ok: true; rows: ScreenRow[] } | { ok: false; error?: string };

export function AdminScreenOptionsClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [brandId, setBrandId] = useState<number | "">("");
  const [modelId, setModelId] = useState<number | "">("");

  const [rows, setRows] = useState<ScreenRow[]>([]);

  const [newLabel, setNewLabel] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => rows.find((r) => r.id === editingId) ?? null, [rows, editingId]);
  const [editLabel, setEditLabel] = useState("");
  const [editActive, setEditActive] = useState(true);

  const filteredModels = useMemo(() => {
    if (!brandId) return models;
    return models.filter((m) => m.brand_id === Number(brandId));
  }, [models, brandId]);

  async function loadMeta() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`${apiBaseUrl}/api/admin/screen-options/meta`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as MetaResp | null;

    if (!res.ok || !data || (data as any).ok !== true) {
      setBrands([]);
      setModels([]);
      setLoading(false);
      setMsg((data as any)?.error ?? "Erro ao carregar marcas/modelos");
      return;
    }

    setBrands((data as any).brands ?? []);
    setModels((data as any).models ?? []);
    setLoading(false);
  }

  async function loadOptions(mid: number) {
    setMsg(null);
    const res = await fetch(`${apiBaseUrl}/api/admin/screen-options?modelId=${encodeURIComponent(String(mid))}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ListResp | null;

    if (!res.ok || !data || (data as any).ok !== true) {
      setRows([]);
      setMsg((data as any)?.error ?? "Erro ao carregar telas");
      return;
    }

    const list = Array.isArray((data as any).rows) ? ((data as any).rows as any[]) : [];
    const parsed: ScreenRow[] = list
      .map((x) => ({
        id: Number(x?.id),
        label: String(x?.label ?? ""),
        active: Boolean(x?.active),
      }))
      .filter((x) => Number.isFinite(x.id) && x.label);

    setRows(parsed);
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    // reset edit when changing selection
    setEditingId(null);
    setEditLabel("");
    setEditActive(true);
  }, [modelId]);

  useEffect(() => {
    if (!modelId) {
      setRows([]);
      return;
    }
    loadOptions(Number(modelId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  useEffect(() => {
    if (!editing) return;
    setEditLabel(editing.label);
    setEditActive(editing.active);
  }, [editing]);

  async function createOption() {
    if (modelId === "") return setMsg("Selecione um modelo.");
    const label = newLabel.trim();
    if (!label) return setMsg("Digite o nome/descrição da tela.");

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/screen-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ modelId: Number(modelId), label, active: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg(data?.error ?? "Erro ao criar tela");
        return;
      }
      setNewLabel("");
      setMsg("Tela criada ✅");
      await loadOptions(Number(modelId));
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (modelId === "" || editingId == null) return;
    const label = editLabel.trim();
    if (!label) return setMsg("Digite o nome/descrição da tela.");

    setBusy(true);
    setMsg(null);
    try {
      // Reaproveita o bulk pra evitar criar nova rota.
      const res = await fetch(`${apiBaseUrl}/api/admin/screen-options/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          modelId: Number(modelId),
          items: [{ id: editingId, label, active: editActive }],
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg(data?.error ?? "Erro ao salvar");
        return;
      }
      setEditingId(null);
      setMsg("Alterações salvas ✅");
      await loadOptions(Number(modelId));
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(id: number) {
    const ok = confirm("Desativar esta tela? (Ela pode ficar indisponível para novas escolhas)");
    if (!ok) return;

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/admin/screen-options/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg(data?.error ?? "Erro ao desativar");
        return;
      }
      setMsg("Tela desativada ✅");
      if (modelId !== "") await loadOptions(Number(modelId));
    } finally {
      setBusy(false);
    }
  }

  const groupedByModel = useMemo(() => {
    const map = new Map<number, ScreenRow[]>();
    for (const r of rows) {
      // rows já são do model selecionado, mas mantém preparado.
      const arr = map.get(Number(modelId)) ?? [];
      arr.push(r);
      map.set(Number(modelId), arr);
    }
    return Array.from(map.values())[0] ?? [];
  }, [rows, modelId]);

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Selecionar modelo</div>

      {loading ? (
        <p className="sub">Carregando...</p>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          <div className="grid grid-2">
            <select
              value={brandId}
              onChange={(e) => {
                const next = e.target.value ? Number(e.target.value) : "";
                setBrandId(next);
                setModelId("");
                setRows([]);
                setEditingId(null);
              }}
              style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            >
              <option value="">Todas as marcas…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : "")}
              style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            >
              <option value="">Selecione o modelo…</option>
              {filteredModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="btnRow">
            <button
              className="btn"
              type="button"
              disabled={!modelId || busy}
              onClick={() => modelId && loadOptions(Number(modelId))}
            >
              Recarregar
            </button>
            {msg && <small>{msg}</small>}
          </div>
        </div>
      )}

      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      <div style={{ fontWeight: 900, marginBottom: 10 }}>Adicionar tela</div>
      <div className="grid" style={{ gap: 10 }}>
        <div className="grid grid-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Ex: IMPORTADA LCD VD (PRETO/BRANCO)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)", gridColumn: "1 / -1" }}
          />
        </div>
        <div className="btnRow">
          <button className="btn btnPrimary" type="button" disabled={!modelId || busy} onClick={createOption}>
            {busy ? "Salvando..." : "Criar"}
          </button>
          <small className="sub">As telas são exclusivas do modelo selecionado.</small>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      <div style={{ fontWeight: 900, marginBottom: 10 }}>Telas cadastradas</div>

      {!modelId ? (
        <p className="sub">Selecione um modelo para ver as telas.</p>
      ) : groupedByModel.length === 0 ? (
        <p className="sub">Nenhuma tela cadastrada para este modelo.</p>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {groupedByModel.map((r) => (
            <div
              key={r.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div>
                <div className="cardTitle">{r.label}</div>
                <div className="cardMeta">
                  ID: {r.id} • {r.active ? "Ativa" : "Inativa"}
                </div>
              </div>

              <div className="btnRow">
                <button className="btn" type="button" onClick={() => setEditingId(r.id)}>
                  Editar
                </button>
                <button className="btn" type="button" onClick={() => deactivate(r.id)} disabled={busy || !r.active}>
                  Desativar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId != null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Editar tela</div>
          <div
            className="grid"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 14,
              gap: 10,
            }}
          >
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Nome/descrição"
              style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            />

            <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
              <span>Ativa</span>
            </label>

            <div className="btnRow">
              <button className="btn btnPrimary" type="button" onClick={saveEdit} disabled={busy}>
                {busy ? "Salvando..." : "Salvar"}
              </button>
              <button className="btn" type="button" onClick={() => setEditingId(null)} disabled={busy}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sub" style={{ marginTop: 10 }}>
        Preços de telas são configurados por loja em <b>Admin → Preços de tela</b> ou pela própria loja.
      </div>
    </div>
  );
}
