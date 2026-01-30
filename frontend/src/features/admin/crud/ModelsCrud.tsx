"use client";

import React from "react";
import { api } from "@/services/api";
import type { Brand, Model, Service } from "@/types/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export function ModelsCrud() {
  const [brands, setBrands] = React.useState<Brand[]>([]);
  const [models, setModels] = React.useState<Model[]>([]);
  const [services, setServices] = React.useState<Service[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // modal modelo
  const [openModel, setOpenModel] = React.useState(false);
  const [editing, setEditing] = React.useState<Model | null>(null);
  const [name, setName] = React.useState("");
  const [brandId, setBrandId] = React.useState("");

  // modal associação services
  const [openAssoc, setOpenAssoc] = React.useState(false);
  const [assocModel, setAssocModel] = React.useState<Model | null>(null);
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([]);

  async function load() {
    setError(null);
    try {
      const [b, m, s] = await Promise.all([api.listBrands(), api.listModels(), api.listServices()]);
      setBrands(b);
      setModels(m);
      setServices(s);
      if (!brandId && b[0]) setBrandId(b[0].id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setName("");
    setBrandId(brands[0]?.id || "");
    setOpenModel(true);
  }

  function startEdit(m: Model) {
    setEditing(m);
    setName(m.name);
    setBrandId(m.brandId);
    setOpenModel(true);
  }

  async function saveModel() {
    setError(null);
    try {
      if (!name.trim()) throw new Error("Nome é obrigatório");
      if (!brandId) throw new Error("brandId é obrigatório");
      if (editing) {
        await api.updateModel(editing.id, { name: name.trim(), brandId });
      } else {
        await api.createModel({ name: name.trim(), brandId });
      }
      setOpenModel(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function removeModel(id: string) {
    setError(null);
    try {
      await api.deleteModel(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function openServicesAssoc(m: Model) {
    setError(null);
    try {
      const current = await api.getModelServices(m.id);
      setAssocModel(m);
      setSelectedServiceIds(current.map(x => x.id));
      setOpenAssoc(true);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function toggleServiceId(id: string) {
    setSelectedServiceIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }

  async function saveAssoc() {
    if (!assocModel) return;
    setError(null);
    try {
      await api.setModelServices(assocModel.id, selectedServiceIds);
      setOpenAssoc(false);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Card className="border border-dracula-accent2">Erro: {error}</Card>}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-dracula-subtext">CRUD de modelos + vínculo modelo ↔ serviços</div>
        <Button onClick={startCreate}>Novo modelo</Button>
      </div>

      <div className="grid gap-3">
        {models.map((m) => (
          <Card key={m.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold">{m.name}</div>
              <div className="text-sm text-dracula-subtext">{m.brand?.name || m.brandId}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => openServicesAssoc(m)}>Serviços</Button>
              <Button variant="secondary" onClick={() => startEdit(m)}>Editar</Button>
              <Button variant="secondary" onClick={() => removeModel(m.id)}>Excluir</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={openModel} title={editing ? "Editar modelo" : "Criar modelo"} onClose={() => setOpenModel(false)}>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-dracula-subtext">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-dracula-subtext">Marca</label>
            <select
              className="w-full px-3 py-2 rounded-md bg-dracula-bg border border-dracula-subtext"
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <Button onClick={saveModel}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>

      <Modal
        open={openAssoc}
        title={assocModel ? `Serviços do modelo: ${assocModel.name}` : "Serviços do modelo"}
        onClose={() => setOpenAssoc(false)}
      >
        <div className="space-y-3">
          <div className="text-sm text-dracula-subtext">
            Marque quais serviços o modelo suporta.
          </div>

          <div className="grid gap-2">
            {services.map((s) => (
              <label key={s.id} className="flex items-center gap-2 rounded-md bg-dracula-bg p-2 border border-dracula-subtext/40">
                <input
                  type="checkbox"
                  checked={selectedServiceIds.includes(s.id)}
                  onChange={() => toggleServiceId(s.id)}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>

          <Button onClick={saveAssoc}>Salvar vínculos</Button>
        </div>
      </Modal>
    </div>
  );
}
