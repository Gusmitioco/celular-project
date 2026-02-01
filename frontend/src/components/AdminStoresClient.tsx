"use client";

import { useEffect, useMemo, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type Store = {
  id: number;
  name: string;
  city: string;
  address: string;
};

type StoreUser = {
  id: number;
  username: string;
  active: boolean;
  created_at: string;
};

export function AdminStoresClient() {
  const api = apiBaseUrl;

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newAddress, setNewAddress] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const editingStore = useMemo(
    () => stores.find((s) => s.id === editingId) ?? null,
    [stores, editingId]
  );

  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Store logins state
  const [storeUsers, setStoreUsers] = useState<StoreUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMsg, setUsersMsg] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`${api}/api/admin/stores`, {
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao carregar lojas");
      setStores([]);
      setLoading(false);
      return;
    }

    setStores(data.stores ?? []);
    setLoading(false);
  }

  async function loadStoreUsers(storeId: number) {
    setUsersLoading(true);
    setUsersMsg(null);

    const res = await fetch(`${api}/api/admin/stores/${storeId}/store-users`, {
      credentials: "include",
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);

    if (res.status === 401) {
      window.location.href = "/admin/login";
      return;
    }

    if (!res.ok || !data?.ok) {
      setStoreUsers([]);
      setUsersMsg(data?.error ?? "Erro ao carregar logins");
      setUsersLoading(false);
      return;
    }

    setStoreUsers(data.users ?? []);
    setUsersLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!editingStore) return;

    setEditName(editingStore.name);
    setEditCity(editingStore.city);
    setEditAddress(editingStore.address);

    // reset login UI on opening
    setStoreUsers([]);
    setUsersMsg(null);
    setNewUsername("");
    setNewPassword("");

    loadStoreUsers(editingStore.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingStore?.id]);

  async function createStore() {
    setMsg(null);

    if (!newName.trim() || !newCity.trim() || !newAddress.trim()) {
      setMsg("Preencha nome, cidade e endereço.");
      return;
    }

    const res = await fetch(`${api}/api/admin/stores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: newName.trim(),
        city: newCity.trim(),
        address: newAddress.trim(),
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao criar loja");
      return;
    }

    setNewName("");
    setNewCity("");
    setNewAddress("");
    setMsg("Loja criada ✅");
    await load();
  }

  async function saveEdit() {
    if (editingId == null) return;

    setMsg(null);

    if (!editName.trim() || !editCity.trim() || !editAddress.trim()) {
      setMsg("Preencha nome, cidade e endereço.");
      return;
    }

    const res = await fetch(`${api}/api/admin/stores/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: editName.trim(),
        city: editCity.trim(),
        address: editAddress.trim(),
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao salvar");
      return;
    }

    setMsg("Alterações salvas ✅");
    setEditingId(null);
    await load();
  }

  async function removeStore(id: number) {
    const ok = confirm("Deletar esta loja? (Pode falhar se houver preços vinculados)");
    if (!ok) return;

    setMsg(null);

    const res = await fetch(`${api}/api/admin/stores/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao deletar");
      return;
    }

    setMsg("Loja removida ✅");
    await load();
  }

  async function createStoreUser() {
    if (!editingStore) return;

    setUsersMsg(null);

    const username = newUsername.trim().toLowerCase();
    const password = newPassword;

    if (!username) {
      setUsersMsg("Informe um usuário.");
      return;
    }
    if (password.length < 6) {
      setUsersMsg("Senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const res = await fetch(`${api}/api/admin/stores/${editingStore.id}/store-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setUsersMsg(data?.error ?? "Erro ao criar login");
      return;
    }

    setNewUsername("");
    setNewPassword("");
    setUsersMsg("Login criado ✅");
    await loadStoreUsers(editingStore.id);
  }

  async function toggleStoreUserActive(userId: number, nextActive: boolean) {
    if (!editingStore) return;
    setUsersMsg(null);

    const res = await fetch(`${api}/api/admin/stores/${editingStore.id}/store-users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ active: nextActive }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setUsersMsg(data?.error ?? "Erro ao atualizar usuário");
      return;
    }

    setUsersMsg(nextActive ? "Usuário ativado ✅" : "Usuário desativado ✅");
    await loadStoreUsers(editingStore.id);
  }

  async function resetStoreUserPassword(userId: number) {
    if (!editingStore) return;

    const pwd = prompt("Nova senha (mín. 6 caracteres):");
    if (pwd == null) return; // cancel
    if (pwd.length < 6) {
      setUsersMsg("Senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setUsersMsg(null);

    const res = await fetch(`${api}/api/admin/stores/${editingStore.id}/store-users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password: pwd }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) {
      setUsersMsg(data?.error ?? "Erro ao resetar senha");
      return;
    }

    setUsersMsg("Senha resetada ✅");
  }

  return (
    <div className="surface" style={{ padding: 16 }}>
      {/* Create */}
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Adicionar loja</div>

      <div className="grid" style={{ gap: 10 }}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome (ex: TechFix Belo Horizonte)"
          style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
        />
        <div className="grid grid-2">
          <input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="Cidade (ex: Belo Horizonte)"
            style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
          />
          <input
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Endereço"
            style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
          />
        </div>

        <div className="btnRow">
          <button className="btn btnPrimary" type="button" onClick={createStore}>
            Criar
          </button>
          {msg && <small>{msg}</small>}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", margin: "16px 0" }} />

      {/* List */}
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Lojas cadastradas</div>

      {loading ? (
        <p className="sub">Carregando...</p>
      ) : stores.length === 0 ? (
        <p className="sub">Nenhuma loja cadastrada.</p>
      ) : (
        <div className="grid">
          {stores.map((s) => (
            <div
              key={s.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              <div>
                <div className="cardTitle">{s.name}</div>
                <div className="cardMeta">{s.city}</div>
                <div className="cardMeta">{s.address}</div>
              </div>

              <div className="btnRow">
                <button className="btn" type="button" onClick={() => setEditingId(s.id)}>
                  Editar
                </button>
                <button className="btn" type="button" onClick={() => removeStore(s.id)}>
                  Deletar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit panel */}
      {editingId != null && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Editar loja</div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: 14,
              background: "var(--card)",
            }}
            className="grid"
          >
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Nome"
              style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
            />
            <div className="grid grid-2">
              <input
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                placeholder="Cidade"
                style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
              />
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Endereço"
                style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
              />
            </div>

            <div className="btnRow">
              <button className="btn btnPrimary" type="button" onClick={saveEdit}>
                Salvar
              </button>
              <button className="btn" type="button" onClick={() => setEditingId(null)}>
                Cancelar
              </button>
              {msg && <small>{msg}</small>}
            </div>

            {/* Store logins */}
            {editingStore && (
              <>
                <div style={{ borderTop: "1px solid var(--border)", margin: "14px 0" }} />

                <div style={{ fontWeight: 900 }}>Logins da loja</div>
                <p className="sub" style={{ marginTop: 6 }}>
                  Crie usuários para a loja acessar o painel /store e validar códigos.
                </p>

                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 14,
                    background: "var(--card)",
                  }}
                >
                  <div className="grid" style={{ gap: 10 }}>
                    <div className="grid grid-2">
                      <input
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Usuário (ex: techfixbh)"
                        style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
                      />
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Senha (mín. 6)"
                        type="password"
                        style={{ padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
                      />
                    </div>

                    <div className="btnRow">
                      <button className="btn btnPrimary" type="button" onClick={createStoreUser}>
                        Criar login
                      </button>
                      <button
                        className="btn"
                        type="button"
                        onClick={() => loadStoreUsers(editingStore.id)}
                        disabled={usersLoading}
                      >
                        Atualizar
                      </button>
                      {usersMsg && <small>{usersMsg}</small>}
                    </div>

                    {usersLoading ? (
                      <p className="sub">Carregando logins...</p>
                    ) : storeUsers.length === 0 ? (
                      <p className="sub">Nenhum login criado para esta loja ainda.</p>
                    ) : (
                      <div className="grid" style={{ gap: 10 }}>
                        {storeUsers.map((u) => (
                          <div
                            key={u.id}
                            style={{
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius)",
                              padding: 12,
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 12,
                              alignItems: "flex-start",
                            }}
                          >
                            <div>
                              <div className="cardTitle">{u.username}</div>
                              <div className="cardMeta">
                                Status: <b>{u.active ? "ativo" : "inativo"}</b>
                              </div>
                              <div className="cardMeta">
                                Criado em: {new Date(u.created_at).toLocaleString("pt-BR")}
                              </div>
                            </div>

                            <div className="btnRow" style={{ alignItems: "center" }}>
                              <button className="btn" type="button" onClick={() => resetStoreUserPassword(u.id)}>
                                Resetar senha
                              </button>
                              {u.active ? (
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => toggleStoreUserActive(u.id, false)}
                                >
                                  Desativar
                                </button>
                              ) : (
                                <button className="btn" type="button" onClick={() => toggleStoreUserActive(u.id, true)}>
                                  Ativar
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
