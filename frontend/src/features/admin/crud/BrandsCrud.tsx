"use client";

import React from "react";
import { api } from "@/services/api";
import type { Brand } from "@/types/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function BrandsCrud() {
  const [items, setItems] = React.useState<Brand[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");

  const load = React.useCallback(() => {
    setError(null);
    api.listBrands()
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setOpen(true);
  };

  const startEdit = (b: Brand) => {
    setEditing(b);
    setName(b.name);
    setSlug(b.slug);
    setOpen(true);
  };

  const save = async () => {
    try {
      setError(null);
      const finalSlug = slug.trim() ? slug.trim() : slugify(name);
      if (!name.trim()) throw new Error("Nome é obrigatório");

      if (editing) {
        await api.updateBrand(editing.id, { name: name.trim(), slug: finalSlug });
      } else {
        await api.createBrand({ name: name.trim(), slug: finalSlug });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      setError(e.message || "Erro ao salvar");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta marca?")) return;
    try {
      setError(null);
      await api.deleteBrand(id);
      load();
    } catch (e: any) {
      setError(e.message || "Erro ao remover");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-dracula-subtext">
          CRUD básico de marcas (name + slug)
        </div>
        <Button onClick={startCreate}>Nova marca</Button>
      </div>

      {error && (
        <Card className="border border-dracula-accent2">
          {error}
        </Card>
      )}

      <div className="grid gap-3">
        {items.map((b) => (
          <Card key={b.id} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="font-bold">{b.name}</div>
              <div className="text-sm text-dracula-subtext">{b.slug}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => startEdit(b)}>Editar</Button>
              <Button variant="danger" onClick={() => remove(b.id)}>Remover</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={open}
        title={editing ? "Editar marca" : "Nova marca"}
        onClose={() => setOpen(false)}
      >
        <div className="space-y-3">
          <Input label="Nome" value={name} onChange={(e) => {
            const v = e.target.value;
            setName(v);
            if (!editing) setSlug(slugify(v));
          }} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
