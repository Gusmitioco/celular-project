"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";
import { rotas } from "@/lib/rotas";

export default function ContaPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Card>
          <div className="text-dracula-text/80">Carregando…</div>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-10">
        <Card>
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-dracula-text">Minha conta</h1>
            <p className="text-sm text-dracula-text/75">
              Para acessar seus dados e pedidos, faça login.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/login?returnTo=${encodeURIComponent("/conta")}`}
                className="inline-flex items-center justify-center rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20] glass-fix transition hover:bg-white/[0.18]"
              >
                Login
              </Link>
              <Link
                href={`/cadastro?returnTo=${encodeURIComponent("/conta")}`}
                className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white"
              >
                Cadastro
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Minha conta</h1>
        <BackButton onClick={() => router.push(rotas.home())} label="Home" />
      </div>

      <Card>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-dracula-text/70">Nome</div>
            <div className="mt-1 text-lg font-semibold text-dracula-text">{user.name || "—"}</div>
          </div>

          <div>
            <div className="text-sm text-dracula-text/70">E-mail</div>
            <div className="mt-1 text-lg font-semibold text-dracula-text">{user.email || "—"}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
            <p className="text-sm text-dracula-text/75">
              Em breve você poderá editar seus dados aqui (nome, telefone, etc.).
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/meus-pedidos"
              className="inline-flex items-center justify-center rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20] glass-fix transition hover:bg-white/[0.18]"
            >
              Ver meus pedidos
            </Link>

            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-semibold text-dracula-text/90 ring-1 ring-white/[0.12] transition hover:bg-white/[0.10]"
            >
              Sair
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
