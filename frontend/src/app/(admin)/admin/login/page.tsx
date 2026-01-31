"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Login failed");
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1 className="h2">Admin login</h1>
      <p className="sub">Acesso do proprietário</p>

      <div className="surface" style={{ padding: 16, maxWidth: 520 }}>
        <form onSubmit={onSubmit} className="grid" style={{ gap: 12 }}>
          <div>
            <div className="cardMeta" style={{ marginBottom: 6 }}>Usuário</div>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
              autoComplete="username"
            />
          </div>

          <div>
            <div className="cardMeta" style={{ marginBottom: 6 }}>Senha</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid var(--border)" }}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div style={{ color: "#b91c1c", fontSize: 14 }}>
              {error}
            </div>
          )}

          <button
            className={`btn btnPrimary ${loading ? "btnDisabled" : ""}`}
            type="submit"
            disabled={loading}
            style={{ justifySelf: "start" }}
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
