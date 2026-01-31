"use client";

import { useEffect, useMemo, useState } from "react";

type Store = { id: number; name: string; city: string };
type Brand = { id: number; name: string };

// Accept snake_case or camelCase, and allow string ids too (we coerce to number)
type Model = {
  id: number | string;
  name: string;
  brand_id?: number | string;
  brandId?: number | string;
};

type MetaResp = {
  ok: true;
  stores: Store[];
  brands: Brand[];
  models: Model[];
};

export function AdminStoreModelsClient() {
  const [meta, setMeta] = useState<MetaResp | null>(null);

  const [storeId, setStoreId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingSelection, setLoadingSelection] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load meta (stores/brands/models)
  useEffect(() => {
    setLoadingMeta(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/store-models/meta`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => setMeta(null))
      .finally(() => setLoadingMeta(false));
  }, []);

  // Load selection when store changes
  useEffect(() => {
    if (storeId === "") {
      setSelected(new Set());
      setBrandId("");
      return;
    }

    setLoadingSelection(true);
    setMsg(null);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/store-models?storeId=${storeId}`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        const ids = Array.isArray(d?.modelIds) ? d.modelIds : [];
        const normalized = ids
          .map((x: any) => Number(x))
          .filter((n: number) => Number.isFinite(n));
        setSelected(new Set(normalized));
      })
      .catch(() => setSelected(new Set()))
      .finally(() => setLoadingSelection(false));
  }, [storeId]);

  // ✅ FIX: Coerce model brand id to number before comparing
  const modelsForBrand = useMemo(() => {
    if (!meta || brandId === "") return [];
    const target = Number(brandId);

    return meta.models
      .filter((m) => {
        const raw = (m.brand_id ?? m.brandId) as any;
        const bid = Number(raw);
        return Number.isFinite(bid) && bid === target;
      })
      .map((m) => ({
        id: Number(m.id),
        name: m.name,
      }))
      .filter((m) => Number.isFinite(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [meta, brandId]);

  function toggleModel(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (storeId === "") return;

    setSaving(true);
    setMsg(null);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/store-models/set`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        storeId,
        modelIds: Array.from(selected.values()),
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao salvar");
      setSaving(false);
      return;
    }

    setMsg("Salvo ✅");
    setSaving(false);
  }

  if (loadingMeta) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p className="sub">Carregando…</p>
      </div>
    );
  }

  if (!meta || !meta.ok) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0 }}>Não foi possível carregar dados. Verifique login e backend.</p>
      </div>
    );
  }

  // Small debug (helps confirm meta has models)
  const debugModelsCount = meta.models?.length ?? 0;

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div className="grid" style={{ gap: 12 }}>
        <div className="grid grid-2">
          <div>
            <div className="cardMeta" style={{ marginBottom: 6 }}>Loja</div>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            >
              <option value="">Selecione…</option>
              {meta.stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.city} — {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="cardMeta" style={{ marginBottom: 6 }}>Marca (filtro)</div>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
              disabled={storeId === "" || loadingSelection}
            >
              <option value="">{storeId === "" ? "Selecione a loja primeiro…" : "Selecione…"}</option>
              {meta.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <small className="cardMeta">Debug: meta.models = {debugModelsCount}</small>

        {msg && <small>{msg}</small>}

        {storeId === "" ? (
          <p className="sub">Selecione uma loja para carregar os modelos atendidos.</p>
        ) : loadingSelection ? (
          <p className="sub">Carregando seleção…</p>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 900 }}>
                Modelos atendidos {brandId !== "" ? "(filtrados pela marca)" : ""}
              </div>

              <button
                className={`btn btnPrimary ${saving ? "btnDisabled" : ""}`}
                type="button"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>

            {brandId === "" ? (
              <p className="sub">Selecione uma marca para ver os modelos e marcar/desmarcar.</p>
            ) : modelsForBrand.length === 0 ? (
              <p className="sub">Nenhum modelo encontrado para essa marca.</p>
            ) : (
              <div className="grid" style={{ gap: 10 }}>
                {modelsForBrand.map((m) => {
                  const checked = selected.has(m.id);
                  return (
                    <label
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        alignItems: "center",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: 14,
                      }}
                    >
                      <div>
                        <div className="cardTitle">{m.name}</div>
                        <div className="cardMeta">ID: {m.id}</div>
                      </div>

                      <input type="checkbox" checked={checked} onChange={() => toggleModel(m.id)} />
                    </label>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
