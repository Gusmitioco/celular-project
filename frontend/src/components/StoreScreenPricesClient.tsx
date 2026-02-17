"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatBRLFromCents } from "@/lib/format";
import { apiBaseUrl } from "@/services/api";

type Meta = {
  ok: true;
  store: { id: number; name: string; city: string };
  brands: { id: number; name: string }[];
  // accept both snake_case and camelCase + strings
  models: { id: number | string; name: string; brand_id?: number | string; brandId?: number | string }[];
};

type RowsResp = {
  ok: true;
  rows: {
    screen_option_id: number;
    label: string;
    active: boolean;
    price_cents: number;
    last_price_cents: number;
  }[];
};

function brlToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

function getModelBrandId(m: any): number | null {
  const v = m?.brand_id ?? m?.brandId;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function StoreScreenPricesClient() {
  const [meta, setMeta] = useState<Meta | null>(null);

  const [brandId, setBrandId] = useState<number | "">("");
  const [modelId, setModelId] = useState<number | "">("");

  const [rows, setRows] = useState<RowsResp["rows"]>([]);
  const [editPrice, setEditPrice] = useState<Record<number, string>>({});
  const [editAvailable, setEditAvailable] = useState<Record<number, boolean>>({});

  const [baselinePrice, setBaselinePrice] = useState<Record<number, string>>({});
  const [baselineAvailable, setBaselineAvailable] = useState<Record<number, boolean>>({});

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const saveAllBtnRef = useRef<HTMLButtonElement | null>(null);

  const filteredModels = useMemo(() => {
    if (!meta) return [];
    if (!brandId) return meta.models;
    return meta.models.filter((m) => getModelBrandId(m) === Number(brandId));
  }, [meta, brandId]);

  const dirtyIds = useMemo(() => {
    const ids = new Set<number>();
    for (const r of rows) {
      const id = r.screen_option_id;
      const a0 = !!baselineAvailable[id];
      const a1 = !!editAvailable[id];
      const p0 = (baselinePrice[id] ?? "").trim();
      const p1 = (editPrice[id] ?? "").trim();
      if (a0 !== a1 || p0 !== p1) ids.add(id);
    }
    return Array.from(ids);
  }, [rows, baselineAvailable, editAvailable, baselinePrice, editPrice]);

  useEffect(() => {
    let alive = true;
    setLoadingMeta(true);

    fetch(`${apiBaseUrl}/api/store/screen-prices/meta`, { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((j: any) => {
        if (!alive) return;
        if (!j?.ok) throw new Error(j?.error || "Falha ao carregar meta");
        setMeta(j);
      })
      .catch((e: any) => alive && setMsg(e?.message || "Erro ao carregar"))
      .finally(() => alive && setLoadingMeta(false));

    return () => {
      alive = false;
    };
  }, []);

  async function loadRows() {
    if (modelId === "") return;
    setLoadingRows(true);
    setMsg(null);

    const res = await fetch(`${apiBaseUrl}/api/store/screen-prices?modelId=${modelId}`, {
      credentials: "include",
      cache: "no-store",
    });

    const data = (await res.json()) as any;
    if (!data?.ok) {
      setRows([]);
      setEditPrice({});
      setEditAvailable({});
      setBaselinePrice({});
      setBaselineAvailable({});
      setLoadingRows(false);
      setMsg(data?.error || "Falha ao carregar telas");
      return;
    }

    const list = (data.rows || []) as RowsResp["rows"];
    setRows(list);

    const nextPrice: Record<number, string> = {};
    const nextAvail: Record<number, boolean> = {};
    for (const r of list) {
      const id = r.screen_option_id;
      const available = Number(r.price_cents ?? 0) > 0;
      nextAvail[id] = available;
      nextPrice[id] = available ? (Number(r.price_cents) / 100).toFixed(2).replace(".", ",") : "";
    }

    setEditPrice(nextPrice);
    setBaselinePrice(nextPrice);
    setEditAvailable(nextAvail);
    setBaselineAvailable(nextAvail);

    setLoadingRows(false);
  }

  useEffect(() => {
    if (modelId === "") return;
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  function focusNextPriceInput(current: HTMLInputElement) {
    const nodes = Array.from(document.querySelectorAll<HTMLInputElement>('input[data-price-input="1"]'));
    const idx = nodes.indexOf(current);
    if (idx === -1) return;

    const next = nodes[idx + 1];
    if (next) {
      next.focus();
      next.select();
      return;
    }
    saveAllBtnRef.current?.focus();
  }

  function setAvailability(id: number, next: boolean) {
    setEditAvailable((prev) => ({ ...prev, [id]: next }));
    if (!next) {
      // Keep the typed price so it can be restored later
      return;
    }
    setEditPrice((prev) => ({ ...prev, [id]: (prev[id] ?? "").trim() }));
  }

  async function saveAll() {
    if (modelId === "") return;
    if (dirtyIds.length === 0) return;

    for (const id of dirtyIds) {
      const available = !!editAvailable[id];
      if (!available) continue;
      const cents = brlToCents(editPrice[id] ?? "");
      if (cents == null || cents <= 0) {
        const name = rows.find((r) => r.screen_option_id === id)?.label ?? `#${id}`;
        setMsg(`Defina um preço válido para: ${name}. Ex: 350,00`);
        return;
      }
    }

    setSavingAll(true);
    setMsg(null);

    const items = dirtyIds.map((id) => {
      const available = !!editAvailable[id];
      const cents = brlToCents(editPrice[id] ?? "") ?? 0;
      return { screenOptionId: id, available, priceCents: cents };
    });

    const res = await fetch(`${apiBaseUrl}/api/store/screen-prices/bulk`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, items }),
    });

    const data = await res.json();
    if (!data?.ok) {
      setMsg(data?.error || "Falha ao salvar");
      setSavingAll(false);
      return;
    }

    await loadRows();
    setSavingAll(false);
    setMsg("Salvo!");
  }

  if (loadingMeta || !meta) {
    return (
      <div className="surface" style={{ padding: 16 }}>
        <p style={{ margin: 0 }}>Carregando… (se falhar, verifique se está logado no /store/login)</p>
      </div>
    );
  }

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div className="grid" style={{ gap: 12 }}>
        <div className="cardMeta">
          Loja: <b>{meta.store.city}</b> — <b>{meta.store.name}</b>
        </div>

        {msg ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 12,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <span className="cardMeta">{msg}</span>
          </div>
        ) : null}

        <div className="grid grid-2">
          <div>
            <div className="cardMeta" style={{ marginBottom: 6 }}>
              Marca
            </div>
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value ? Number(e.target.value) : "");
                setModelId("");
              }}
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

          <div>
            <div className="cardMeta" style={{ marginBottom: 6 }}>
              Modelo
            </div>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value ? Number(e.target.value) : "")}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            >
              <option value="">Selecione…</option>
              {filteredModels.map((m) => (
                <option key={String(m.id)} value={Number(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <button className="btn" onClick={loadRows} disabled={modelId === "" || loadingRows || savingAll}>
            Recarregar
          </button>
          <button
            ref={saveAllBtnRef}
            className="btn primary"
            onClick={saveAll}
            disabled={modelId === "" || loadingRows || savingAll || dirtyIds.length === 0}
          >
            {savingAll ? "Salvando…" : `Salvar tudo${dirtyIds.length ? ` (${dirtyIds.length})` : ""}`}
          </button>
        </div>

        <div>
          {modelId === "" ? (
            <div className="cardMeta">Selecione Marca + Modelo para editar.</div>
          ) : loadingRows ? (
            <div className="cardMeta">Carregando telas…</div>
          ) : rows.length === 0 ? (
            <div className="cardMeta">Nenhuma tela cadastrada para este modelo.</div>
          ) : (
            <div className="grid" style={{ gap: 10 }}>
              {rows.map((r) => {
                const id = r.screen_option_id;
                const available = !!editAvailable[id];
                const currentText =
                  r.price_cents > 0 ? formatBRLFromCents(r.price_cents) : "Indisponível";

                const changed =
                  (editPrice[id] ?? "").trim() !== (baselinePrice[id] ?? "").trim() ||
                  !!editAvailable[id] !== !!baselineAvailable[id];

                return (
                  <div
                    key={id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      padding: 14,
                      display: "grid",
                      gridTemplateColumns: "1fr 180px 140px",
                      gap: 10,
                      alignItems: "center",
                      opacity: r.active ? 1 : 0.6,
                    }}
                  >
                    <div>
                      <div className="cardTitle">{r.label}</div>
                      <div className="cardMeta">
                        Atual: {currentText} {r.active ? "" : "• (desativada)"}
                      </div>
                    </div>

                    <input
                      data-price-input="1"
                      value={available ? (editPrice[id] ?? "") : ""}
                      onChange={(e) => setEditPrice((prev) => ({ ...prev, [id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          focusNextPriceInput(e.currentTarget);
                        }
                      }}
                      disabled={!available}
                      placeholder={available ? "Ex: 350,00" : "Indisponível"}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: available ? "transparent" : "rgba(255,255,255,0.03)",
                      }}
                    />

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={available}
                          onChange={(e) => setAvailability(id, e.target.checked)}
                        />
                        <small className="cardMeta">Disponível</small>
                      </label>

                      <small className="cardMeta" style={{ textAlign: "right" }}>
                        {changed ? "Alterado" : ""}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
