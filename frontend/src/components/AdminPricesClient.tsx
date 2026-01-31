"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatBRLFromCents } from "@/lib/format";
import { apiBaseUrl } from "@/services/api";

type Meta = {
  ok: true;
  stores: { id: number; name: string; city: string }[];
  brands: { id: number; name: string }[];
  // accept both snake_case and camelCase + strings
  models: { id: number | string; name: string; brand_id?: number | string; brandId?: number | string }[];
  services: { id: number; name: string }[];
};

type PricesResp = {
  ok: true;
  rows: {
    service_id: number;
    service_name: string;
    price_cents: number | null;
    currency: string | null;
  }[];
};

function brlToCents(input: string): number | null {
  // accepts "350", "350,00", "350.00", "R$ 350,00"
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export function AdminPricesClient() {
  const [meta, setMeta] = useState<Meta | null>(null);

  const [storeId, setStoreId] = useState<number | "">("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [modelId, setModelId] = useState<number | "">("");

  const [rows, setRows] = useState<PricesResp["rows"]>([]);
  const [edit, setEdit] = useState<Record<number, string>>({});
  const [baseline, setBaseline] = useState<Record<number, string>>({});
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const saveAllBtnRef = useRef<HTMLButtonElement | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/admin/prices/meta`, {
      credentials: "include",
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => setMeta(d))
      .catch(() => setMeta(null));
  }, []);

  // ✅ FIX: normalize brand id before filtering
  const modelsForBrand = useMemo(() => {
    if (!meta || brandId === "") return [];
    const target = Number(brandId);

    return meta.models
      .filter((m) => {
        const raw = (m.brand_id ?? m.brandId) as any;
        const bid = Number(raw);
        return Number.isFinite(bid) && bid === target;
      })
      .map((m) => ({ id: Number(m.id), name: m.name }))
      .filter((m) => Number.isFinite(m.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [meta, brandId]);

  useEffect(() => {
    // reset model when brand changes
    setModelId("");
    setRows([]);
    setEdit({});
    setBaseline({});
  }, [brandId]);

  const dirtyIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of rows) {
      const now = (edit[r.service_id] ?? "").trim();
      const base = (baseline[r.service_id] ?? "").trim();
      if (now !== base) ids.add(r.service_id);
    }
    return Array.from(ids);
  }, [rows, edit, baseline]);

  async function loadRows() {
    if (storeId === "" || modelId === "") return;
    setLoadingRows(true);
    setMsg(null);

    const res = await fetch(
      `${apiBaseUrl}/api/admin/prices?storeId=${storeId}&modelId=${modelId}`,
      { credentials: "include", cache: "no-store" }
    );

    const data = (await res.json()) as PricesResp;
    setRows(data.rows);

    const next = Object.fromEntries(
      data.rows.map((r) => [
        r.service_id,
        r.price_cents == null ? "" : (r.price_cents / 100).toFixed(2).replace(".", ","),
      ])
    );

    setEdit(next);
    setBaseline(next);

    setLoadingRows(false);
  }

  
function focusNextPriceInput(current: HTMLInputElement) {
  const nodes = Array.from(
    document.querySelectorAll<HTMLInputElement>('input[data-price-input="1"]')
  );
  const idx = nodes.indexOf(current);
  if (idx === -1) return;

  const next = nodes[idx + 1];
  if (next) {
    next.focus();
    next.select();
    return;
  }
  // if this is the last input, move focus to the "Salvar tudo" button
  saveAllBtnRef.current?.focus();
}

async function saveAll() {
    if (storeId === "" || modelId === "") return;
    if (dirtyIds.length === 0) return;

    setSavingAll(true);
    setMsg(null);

    const items: { serviceId: number; priceCents: number; currency: string }[] = [];

    for (const serviceId of dirtyIds) {
      const cents = brlToCents(edit[serviceId] ?? "");
      if (cents == null) {
        const name = rows.find((r) => r.service_id === serviceId)?.service_name ?? `#${serviceId}`;
        setMsg(`Preço inválido em: ${name}. Ex: 350,00`);
        setSavingAll(false);
        return;
      }
      items.push({ serviceId, priceCents: cents, currency: "BRL" });
    }

    const res = await fetch(`${apiBaseUrl}/api/admin/prices/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ storeId, modelId, items, currency: "BRL" }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setMsg(d?.error ?? "Erro ao salvar");
      setSavingAll(false);
      return;
    }

    const d = await res.json().catch(() => ({}));
    const count = Number(d?.updated) || items.length;
    setMsg(`Salvo ✅ (${count})`);
    await loadRows();
    setSavingAll(false);
  }

  if (!meta) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0 }}>
          Carregando… (se falhar, verifique se está logado no /admin/login)
        </p>
      </div>
    );
  }

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div className="grid" style={{ gap: 12 }}>
        <div className="grid grid-2">
          <div>
            <div className="cardMeta" style={{ marginBottom: 6 }}>
              Loja
            </div>
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
            <div className="cardMeta" style={{ marginBottom: 6 }}>
              Marca
            </div>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            >
              <option value="">Selecione…</option>
              {meta.brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="cardMeta" style={{ marginBottom: 6 }}>
            Modelo
          </div>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : "")}
            style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            disabled={brandId === ""}
          >
            <option value="">{brandId === "" ? "Selecione a marca primeiro…" : "Selecione…"}</option>
            {modelsForBrand.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <div className="btnRow">
          <button
            className={`btn btnPrimary ${(storeId === "" || modelId === "") ? "btnDisabled" : ""}`}
            disabled={storeId === "" || modelId === ""}
            onClick={loadRows}
            type="button"
          >
            Carregar serviços
          </button>

          <button
            className={`btn btnPrimary ${(storeId === "" || modelId === "" || dirtyIds.length === 0 || savingAll) ? "btnDisabled" : ""}`}
            disabled={storeId === "" || modelId === "" || dirtyIds.length === 0 || savingAll}
            ref={saveAllBtnRef}
            onClick={saveAll}
            type="button"
            title={dirtyIds.length === 0 ? "Nenhuma alteração para salvar" : "Salvar todas as alterações"}
          >
            {savingAll ? "Salvando…" : `Salvar tudo${dirtyIds.length ? ` (${dirtyIds.length})` : ""}`}
          </button>

          {msg && <small>{msg}</small>}
        </div>

        {loadingRows ? (
          <p className="sub">Carregando preços…</p>
        ) : rows.length > 0 ? (
          <div className="grid" style={{ gap: 10, marginTop: 10 }}>
            {rows.map((r) => (
              <div
                key={r.service_id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 14,
                  display: "grid",
                  gridTemplateColumns: "1fr 180px 120px",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div>
                  <div className="cardTitle">{r.service_name}</div>
                  <div className="cardMeta">
                    Atual: {r.price_cents == null ? "—" : formatBRLFromCents(r.price_cents)}
                  </div>
                </div>

                <input
  data-price-input="1"
  value={edit[r.service_id] ?? ""}
  onChange={(e) => setEdit((prev) => ({ ...prev, [r.service_id]: e.target.value }))}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusNextPriceInput(e.currentTarget);
    }
  }}
  placeholder="Ex: 350,00"
  style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
/>

                <div style={{ textAlign: "right" }}>
                  <small className="cardMeta">
                    {(edit[r.service_id] ?? "").trim() !== (baseline[r.service_id] ?? "").trim() ? "Alterado" : ""}
                  </small>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="sub" style={{ marginTop: 10 }}>
            Selecione loja + marca + modelo e clique em “Carregar serviços”.
          </p>
        )}
      </div>
    </div>
  );
}
