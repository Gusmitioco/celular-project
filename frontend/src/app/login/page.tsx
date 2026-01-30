"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { api } from "@/services/api";
import { useAuth } from "@/components/auth/AuthProvider";

function friendlyError(msg: string) {
  if (msg.includes("email_in_use")) return "Esse e-mail já está em uso.";
  if (msg.includes("invalid_credentials")) return "E-mail ou senha inválidos.";
  if (msg.includes("email_invalid")) return "E-mail inválido.";
  if (msg.includes("password_required")) return "Informe sua senha.";
  if (msg.includes("email_required")) return "Informe seu e-mail.";
  return msg;
}

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = params.get("returnTo") || "/";
  const { refresh } = useAuth();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.login({ email, password });
      await refresh();
      router.push(returnTo);
    } catch (err: any) {
      setError(friendlyError(String(err?.message || "Erro ao fazer login")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="max-w-xl">
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Login</h1>
        <p className="mt-2 text-sm text-dracula-text/70">
          Entre para salvar seus pedidos, acompanhar o status e usar o chat em tempo real.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="md:col-span-1">
          <form onSubmit={onSubmit} className="space-y-4">
            {error ? <div className="text-sm text-dracula-accent2">{error}</div> : null}

            <div className="space-y-1">
              <label className="text-sm font-semibold text-dracula-text">E-mail</label>
              <input
                className="w-full rounded-xl bg-white/[0.10] px-3 py-2 text-sm text-dracula-text ring-1 ring-white/[0.18] outline-none placeholder:text-dracula-text/40 focus:ring-2 focus:ring-dracula-accent glass-fix"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seuemail@exemplo.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-dracula-text">Senha</label>
              <input
                className="w-full rounded-xl bg-white/[0.10] px-3 py-2 text-sm text-dracula-text ring-1 ring-white/[0.18] outline-none placeholder:text-dracula-text/40 focus:ring-2 focus:ring-dracula-accent glass-fix"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white disabled:opacity-60"
            >
              {loading ? "Entrando…" : "Entrar"}
            </button>

            <div className="text-xs text-dracula-text/70">
              Não tem conta?{" "}
              <Link
                className="font-semibold text-dracula-accent hover:brightness-95"
                href={`/cadastro?returnTo=${encodeURIComponent(returnTo)}`}
              >
                Criar cadastro
              </Link>
            </div>
          </form>
        </Card>

        <Card className="md:col-span-1">
          <div className="space-y-2">
            <div className="text-sm font-semibold text-dracula-text">Dica</div>
            <p className="text-sm text-dracula-text/70">
              Depois do login, volte ao checkout e clique em <span className="font-semibold text-dracula-text">Confirmar pedido</span>.
              Assim o pedido fica salvo em <span className="font-semibold text-dracula-text">Meus Pedidos</span>.
            </p>

            <div className="pt-2">
              <Link
                href={returnTo}
                className="text-sm font-semibold text-dracula-accent hover:brightness-95"
              >
                Voltar para onde eu estava →
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
