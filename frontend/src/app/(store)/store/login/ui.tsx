"use client";

import { useState } from "react";
import { apiBaseUrl } from "@/services/api";

export function StoreLoginClient() {
  const api = apiBaseUrl;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`${api}/api/store-auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao entrar");
      setLoading(false);
      return;
    }

    window.location.href = "/store";
  }

  return (
    <div className="surface" style={{ padding: 16, maxWidth: 520 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <div className="cardMeta">Usuário</div>
        <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
      </label>

      <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
        <div className="cardMeta">Senha</div>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>

      {msg && <div style={{ marginTop: 10, fontWeight: 900 }}>{msg}</div>}

      <div className="btnRow" style={{ marginTop: 12 }}>
        <button className="btn btnPrimary" type="button" onClick={submit} disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </div>
  );
}
