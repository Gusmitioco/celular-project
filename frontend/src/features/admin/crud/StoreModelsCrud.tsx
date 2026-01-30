"use client";

import React from "react";
import { api } from "@/services/api";
import type { Store, Model } from "@/types/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function StoreModelsCrud() {
  const [stores, setStores] = React.useState<Store[]>([]);
  const [models, setModels] = React.useState<Model[]>([]);
  const [storeId, setStoreId] = React.useState<string>("");
  const [selectedModelIds, setSelectedModelIds] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [savedMsg, setSavedMsg] = React.useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [st, md] = await Promise.all([api.listStores(), api.listModels()]);
      setStores(st);
      setModels(md);

      const initialStoreId = st[0]?.id || "";
      setStoreId(initialStoreId);

      if (initialStoreId) {
        const linked = await api.getStoreModels(initialStoreId);
        setSelectedModelIds(linked.map(m => m.id));
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function changeStore(id: string) {
    setStoreId(id);
    setSavedMsg(null);
    if (!id) return;
    try {
      const linked = await api.getStoreModels(id);
      setSelectedModelIds(linked.map(m => m.id));
    } catch (e: any) {
      setError(e.message);
    }
  }

  function toggle(id: string) {
    setSelectedModelIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  async function save() {
    setError(null);
    setSavedMsg(null);
    try {
      if (!storeId) throw new Error("Selecione uma loja");
      await api.setStoreModels(storeId, selectedModelIds);
      setSavedMsg("Vínculos salvos.");
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Card className="border border-dracula-accent2">Erro: {error}</Card>}
      {savedMsg && <Card className="border border-dracula-accent">{savedMsg}</Card>}

      <Card className="space-y-3">
        <div className="text-sm text-dracula-subtext">Selecione a loja</div>
        <select
          className="w-full px-3 py-2 rounded-md bg-dracula-bg border border-dracula-subtext"
          value={storeId}
          onChange={(e) => changeStore(e.target.value)}
        >
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </Card>

      <Card className="space-y-3">
        <div className="font-bold">Modelos atendidos</div>
        <div className="grid gap-2">
          {models.map((m) => (
            <label key={m.id} className="flex items-center gap-2 rounded-md bg-dracula-bg p-2 border border-dracula-subtext/40">
              <input
                type="checkbox"
                checked={selectedModelIds.includes(m.id)}
                onChange={() => toggle(m.id)}
              />
              <span>{m.brand?.name ? `${m.brand.name} — ${m.name}` : m.name}</span>
            </label>
          ))}
        </div>
        <Button onClick={save}>Salvar</Button>
      </Card>
    </div>
  );
}
