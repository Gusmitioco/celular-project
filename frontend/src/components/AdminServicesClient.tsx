"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type Service = { id: number; name: string };

export function AdminServicesClient() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const editing = useMemo(() => services.find((s) => s.id === editingId) ?? null, [services, editingId]);
  const [editName, setEditName] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`${apiBaseUrl}/api/admin/services`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao carregar serviços");
      setServices([]);
      setLoading(false);
      return;
    }

    setServices(data.services ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!editing) return;
    setEditName(editing.name);
  }, [editing]);

  async function createService() {
    setMsg(null);
    const name = newName.trim();
    if (!name) return setMsg("Digite um nome.");

    const res = await fetch(`${apiBaseUrl}/api/admin/services`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error ?? "Erro ao criar");

    setNewName("");
    setMsg("Serviço criado ✅");
    await load();
  }

  async function saveEdit() {
    if (editingId == null) return;
    setMsg(null);

    const name = editName.trim();
    if (!name) return setMsg("Digite um nome.");

    const res = await fetch(`${apiBaseUrl}/api/admin/services/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error ?? "Erro ao salvar");

    setEditingId(null);
    setMsg("Alterações salvas ✅");
    await load();
  }

  async function removeService(id: number) {
    const ok = confirm("Deletar este serviço? (Pode falhar se houver preços vinculados)");
    if (!ok) return;

    setMsg(null);

    const res = await fetch(`${apiBaseUrl}/api/admin/services/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return setMsg(data?.error ?? "Erro ao deletar");

    setMsg("Serviço removido ✅");
    await load();
  }

  return (
    <div className="surface" style={{ padding: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Adicionar serviço</div>

      <div className="grid" style={{ gap: 10 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Ex: Troca de Tela"
          style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
        />

        <div className="btnRow">
          <button className="btn btnPrimary" type="button" onClick={createService}>
            Criar
          </button>
          {msg && <small>{msg}</small>}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      <div style={{ fontWeight: 900, marginBottom: 10 }}>Serviços cadastrados</div>

      {loading ? (
        <p className="sub">Carregando...</p>
      ) : services.length === 0 ? (
        <p className="sub">Nenhum serviço cadastrado.</p>
      ) : (
        <div className="grid">
          {services.map((s) => (
            <div
              key={s.id}
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
                <div className="cardTitle">{s.name}</div>
                <div className="cardMeta">ID: {s.id}</div>
              </div>

              <div className="btnRow">
                <button className="btn" type="button" onClick={() => setEditingId(s.id)}>
                  Editar
                </button>
                <button className="btn" type="button" onClick={() => removeService(s.id)}>
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId != null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Editar serviço</div>

          <div
            className="grid"
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 14,
              gap: 10,
            }}
          >
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome"
              style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            />

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
