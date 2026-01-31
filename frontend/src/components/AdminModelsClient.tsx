"use client";

import { useEffect, useMemo, useState } from "react";

type Brand = { id: number; name: string };
type ModelRow = { id: number; name: string; brand_id: number; brand_name: string };

type ListResp = { ok: true; brands: Brand[]; models: ModelRow[] };

export function AdminModelsClient() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [newBrandId, setNewBrandId] = useState<number | "">("");
  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => models.find((m) => m.id === editingId) ?? null, [models, editingId]);

  const [editBrandId, setEditBrandId] = useState<number | "">("");
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/models`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ListResp | null;

    if (!res.ok || !data?.ok) {
      setMsg((data as any)?.error ?? "Erro ao carregar modelos");
      setBrands([]);
      setModels([]);
      setLoading(false);
      return;
    }

    setBrands(data.brands ?? []);
    setModels(data.models ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    setEditBrandId(editing.brand_id);
    setEditName(editing.name);
  }, [editing]);

  const grouped = useMemo(() => {
    const map = new Map<string, ModelRow[]>();
    for (const m of models) {
      const key = m.brand_name;
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [models]);

  async function createModel() {
    setMsg(null);
    if (newBrandId === "") return setMsg("Selecione uma marca.");
    const name = newName.trim();
    if (!name) return setMsg("Digite o nome do modelo.");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/models`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ brandId: newBrandId, name }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error ?? "Erro ao criar modelo");

    setNewName("");
    setMsg("Modelo criado ✅");
    await load();
  }

  async function saveEdit() {
    if (editingId == null) return;
    setMsg(null);

    if (editBrandId === "") return setMsg("Selecione uma marca.");
    const name = editName.trim();
    if (!name) return setMsg("Digite o nome do modelo.");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/models/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ brandId: editBrandId, name }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error ?? "Erro ao salvar");

    setEditingId(null);
    setMsg("Alterações salvas ✅");
    await load();
  }

  async function removeModel(id: number) {
    const ok = confirm("Deletar este modelo? (Pode falhar se houver vínculos com lojas/preços)");
    if (!ok) return;

    setMsg(null);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/models/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error ?? "Erro ao deletar");

    setMsg("Modelo removido ✅");
    await load();
  }

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Adicionar modelo</div>

      <div className="grid" style={{ gap: 10 }}>
        <div className="grid grid-2">
          <select
            value={newBrandId}
            onChange={(e) => setNewBrandId(e.target.value ? Number(e.target.value) : "")}
            style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
          >
            <option value="">Selecione a marca…</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex: iPhone 15 Pro"
            style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
          />
        </div>

        <div className="btnRow">
          <button className="btn btnPrimary" type="button" onClick={createModel}>
            Criar
          </button>
          {msg && <small>{msg}</small>}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      <div style={{ fontWeight: 900, marginBottom: 10 }}>Modelos cadastrados</div>

      {loading ? (
        <p className="sub">Carregando...</p>
      ) : models.length === 0 ? (
        <p className="sub">Nenhum modelo cadastrado.</p>
      ) : (
        <div className="grid" style={{ gap: 14 }}>
          {grouped.map(([brandName, list]) => (
            <div key={brandName}>
              <div style={{ fontWeight: 900, marginBottom: 8 }}>{brandName}</div>
              <div className="grid" style={{ gap: 10 }}>
                {list.map((m) => (
                  <div
                    key={m.id}
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
                      <div className="cardTitle">{m.name}</div>
                      <div className="cardMeta">ID: {m.id}</div>
                    </div>

                    <div className="btnRow">
                      <button className="btn" type="button" onClick={() => setEditingId(m.id)}>
                        Editar
                      </button>
                      <button className="btn" type="button" onClick={() => removeModel(m.id)}>
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId != null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Editar modelo</div>

          <div
            className="grid"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 14,
              gap: 10,
            }}
          >
            <div className="grid grid-2">
              <select
                value={editBrandId}
                onChange={(e) => setEditBrandId(e.target.value ? Number(e.target.value) : "")}
                style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
              >
                <option value="">Selecione a marca…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>

              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do modelo"
                style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
              />
            </div>

            <div className="btnRow">
              <button className="btn btnPrimary" type="button" onClick={saveEdit}>
                Salvar
              </button>
              <button className="btn" type="button" onClick={() => setEditingId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
