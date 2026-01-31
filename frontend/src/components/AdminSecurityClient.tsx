"use client";

import { useEffect, useMemo, useState } from "react";

type StoreRow = { id: number; name: string; city: string; address: string };

export function AdminSecurityClient() {
  const api = process.env.NEXT_PUBLIC_API_URL;

  const [confirmText, setConfirmText] = useState("");
  const [loadingAll, setLoadingAll] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // stores selection
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState<number | "">("");
  const [loadingOne, setLoadingOne] = useState(false);

  const selectedStore = useMemo(
    () => stores.find((s) => s.id === selectedStoreId) ?? null,
    [stores, selectedStoreId]
  );

  async function loadStores() {
    setStoresLoading(true);
    try {
      const res = await fetch(`${api}/admin/stores`, {
        credentials: "include",
        cache: "no-store",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        setStores([]);
        setMsg(json?.error ?? "Não foi possível carregar as lojas");
        return;
      }

      const rows: StoreRow[] = json.stores ?? [];
      setStores(rows);

      // IMPORTANT: do NOT auto-select the first store.
      // Keep selection empty until the admin explicitly chooses.
      // If the currently selected store no longer exists, reset it:
      if (selectedStoreId !== "" && !rows.some((s) => s.id === selectedStoreId)) {
        setSelectedStoreId("");
      }
    } catch (e: any) {
      setStores([]);
      setMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setStoresLoading(false);
    }
  }

  useEffect(() => {
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function logoutAllStores() {
    setMsg(null);

    if (confirmText.trim().toUpperCase() !== "DESLOGAR") {
      setMsg('Digite "DESLOGAR" para confirmar.');
      return;
    }

    setLoadingAll(true);
    try {
      const res = await fetch(`${api}/admin/security/logout-all-stores`, {
        method: "POST",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "Falha ao deslogar lojas");
        return;
      }

      setConfirmText("");
      setMsg(`OK ✅ ${json.cleared ?? 0} sessão(ões) de loja removidas.`);
    } catch (e: any) {
      setMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setLoadingAll(false);
    }
  }

  async function logoutOneStore() {
    setMsg(null);

    if (selectedStoreId === "") {
      setMsg("Selecione uma loja.");
      return;
    }

    setLoadingOne(true);
    try {
      const res = await fetch(`${api}/admin/security/logout-store/${selectedStoreId}`, {
        method: "POST",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }

      if (!res.ok || !json?.ok) {
        setMsg(json?.error ?? "Falha ao deslogar esta loja");
        return;
      }

      setMsg(
        `OK ✅ ${json.cleared ?? 0} sessão(ões) removidas de ${
          selectedStore ? `${selectedStore.name} (${selectedStore.city})` : "a loja selecionada"
        }.`
      );
    } catch (e: any) {
      setMsg(String(e?.message ?? "Erro de conexão"));
    } finally {
      setLoadingOne(false);
    }
  }

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900 }}>Segurança (kill switch)</div>
      <p className="sub" style={{ marginTop: 6 }}>
        Use apenas em caso de incidente. Isso desloga lojas removendo sessões ativas.
      </p>

      <div style={{ borderTop: "1px solid var(--border)", margin: "12px 0" }} />

      {/* All stores */}
      <div className="grid" style={{ gap: 10 }}>
        <div className="cardMeta">
          Para confirmar, digite <b>DESLOGAR</b>:
        </div>

        <input
          className="input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder='Digite "DESLOGAR"'
        />

        <div className="btnRow">
          <button className="btn btnPrimary" type="button" disabled={loadingAll} onClick={logoutAllStores}>
            {loadingAll ? "Executando..." : "Deslogar TODAS as lojas"}
          </button>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      {/* One store */}
      <div style={{ fontWeight: 900 }}>Deslogar por loja</div>
      <p className="sub" style={{ marginTop: 6 }}>
        Se apenas uma loja foi comprometida, deslogue somente ela.
      </p>

      <div className="grid" style={{ gap: 10, marginTop: 8 }}>
        <select
          className="input"
          value={selectedStoreId === "" ? "" : String(selectedStoreId)}
          onChange={(e) => setSelectedStoreId(e.target.value ? Number(e.target.value) : "")}
          disabled={storesLoading}
        >
          <option value="">Selecionar...</option>

          {storesLoading ? (
            <option value="" disabled>
              Carregando lojas...
            </option>
          ) : stores.length === 0 ? (
            <option value="" disabled>
              Nenhuma loja encontrada
            </option>
          ) : (
            stores.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} — {s.city}
              </option>
            ))
          )}
        </select>

        {selectedStore && <div className="cardMeta">Endereço: {selectedStore.address}</div>}

        <div className="btnRow" style={{ justifyContent: "space-between" }}>
          <button className="btn" type="button" onClick={loadStores} disabled={storesLoading}>
            Atualizar lista
          </button>

          <button className="btn" type="button" disabled={loadingOne || selectedStoreId === ""} onClick={logoutOneStore}>
            {loadingOne ? "Executando..." : "Deslogar esta loja"}
          </button>
        </div>
      </div>

      {msg && <div style={{ marginTop: 12, fontWeight: 900 }}>{msg}</div>}
    </div>
  );
}
