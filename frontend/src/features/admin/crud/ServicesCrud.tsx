"use client";

import React from "react";
import { api } from "@/services/api";
import type { Service } from "@/types/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { formatBRLFromCents } from "@/lib/money";

export function ServicesCrud() {
  const [items, setItems] = React.useState<Service[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Service | null>(null);
  const [name, setName] = React.useState("");
  const [priceCents, setPriceCents] = React.useState<number>(0);

  async function load() {
    setError(null);
    try {
      setItems(await api.listServices());
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
    setPriceCents(0);
    setOpen(true);
  }

  function startEdit(s: Service) {
    setEditing(s);
    setName(s.name);
    setPriceCents(s.priceCents);
    setOpen(true);
  }

  async function save() {
    setError(null);
    try {
      if (!name.trim()) throw new Error("Nome é obrigatório");
      if (!Number.isFinite(priceCents)) throw new Error("priceCents inválido");
      if (editing) {
        await api.updateService(editing.id, { name: name.trim(), priceCents });
      } else {
        await api.createService({ name: name.trim(), priceCents });
      }
      setOpen(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(id: string) {
    setError(null);
    try {
      await api.deleteService(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Card className="border border-dracula-accent2">Erro: {error}</Card>}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-dracula-subtext">CRUD básico de serviços</div>
        <Button onClick={startCreate}>Novo serviço</Button>
      </div>

      <div className="grid gap-3">
        {items.map((s) => (
          <Card key={s.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold">{s.name}</div>
              <div className="text-sm text-dracula-subtext">{formatBRLFromCents(s.priceCents)} ({s.priceCents} cents)</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => startEdit(s)}>Editar</Button>
              <Button variant="secondary" onClick={() => remove(s.id)}>Excluir</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} title={editing ? "Editar serviço" : "Criar serviço"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-dracula-subtext">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-dracula-subtext">Preço (em centavos)</label>
            <Input
              type="number"
              value={priceCents}
              onChange={(e) => setPriceCents(Number(e.target.value))}
              placeholder="Ex: 45000"
            />
            <div className="text-xs text-dracula-subtext mt-1">
              Visualização: {formatBRLFromCents(priceCents)}
            </div>
          </div>
          <Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
