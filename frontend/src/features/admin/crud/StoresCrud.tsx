"use client";

import React from "react";
import { api } from "@/services/api";
import type { Store } from "@/types/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

export function StoresCrud() {
  const [items, setItems] = React.useState<Store[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Store | null>(null);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");

  async function load() {
    setError(null);
    try {
      setItems(await api.listStores());
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
    setAddress("");
    setOpen(true);
  }

  function startEdit(s: Store) {
    setEditing(s);
    setName(s.name);
    setAddress(s.address);
    setOpen(true);
  }

  async function save() {
    setError(null);
    try {
      if (!name.trim() || !address.trim()) throw new Error("Nome e endereço são obrigatórios");
      if (editing) {
        await api.updateStore(editing.id, { name: name.trim(), address: address.trim() });
      } else {
        await api.createStore({ name: name.trim(), address: address.trim() });
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
      await api.deleteStore(id);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-4">
      {error && <Card className="border border-dracula-accent2">Erro: {error}</Card>}

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-dracula-subtext">CRUD básico de lojas (cidade fixa no backend)</div>
        <Button onClick={startCreate}>Nova loja</Button>
      </div>

      <div className="grid gap-3">
        {items.map((s) => (
          <Card key={s.id} className="flex items-center justify-between gap-3">
            <div>
              <div className="font-bold">{s.name}</div>
              <div className="text-sm text-dracula-subtext">{s.address}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => startEdit(s)}>Editar</Button>
              <Button variant="secondary" onClick={() => remove(s.id)}>Excluir</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={open} title={editing ? "Editar loja" : "Criar loja"} onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-dracula-subtext">Nome</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-dracula-subtext">Endereço</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <Button onClick={save}>{editing ? "Salvar" : "Criar"}</Button>
        </div>
      </Modal>
    </div>
  );
}
