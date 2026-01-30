"use client";

import React from "react";
import Link from "next/link";
import { ClientShell } from "@/components/layout/ClientShell";
import { Card } from "@/components/ui/Card";
import { api } from "@/services/api";
import { useAuth } from "@/components/auth/AuthProvider";

type Row = {
  id: number;
  code: string;
  total_cents: number;
  currency: string;
  status: string;
  created_at: string;
  store_name: string;
  store_address: string;
  model_name: string;
  last_synced_at?: string | null;
};

function statusPT(status: string) {
  const s = (status || "").toLowerCase().trim();
  const map: Record<string, string> = {
    created: "Criado",
    in_progress: "Em andamento",
    done: "Concluído",
    cancelled: "Cancelado",
  };
  return map[s] ?? status;
}

function formatMoneyBRL(cents: number) {
  const v = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${v}`;
}

export default function Page() {
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);

  React.useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setLoading(false);
      setError(null);
      setRows([]);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    api
      .listMyRequests()
      .then((r) => {
        if (!mounted) return;
        setRows(r);
      })
      .catch((e: any) => {
        if (!mounted) return;
        // If not logged in, backend returns 401.
        setError(e?.message || "Você precisa estar logado para ver seus pedidos.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [authLoading, user]);

  const loginHref = `/login?returnTo=${encodeURIComponent("/meus-pedidos")}`;
  const cadastroHref = `/cadastro?returnTo=${encodeURIComponent("/meus-pedidos")}`;

  return (
    <ClientShell title="Meus Pedidos" maxWidthClassName="max-w-5xl">
      <div className="space-y-4">
        {authLoading || loading ? <p className="text-sm text-dracula-text/70">Carregando…</p> : null}

        {!authLoading && !user ? (
          <Card>
            <p className="text-sm text-dracula-text">
              <span className="font-semibold">Meus Pedidos</span> é um recurso para quem tem conta no site.
            </p>
            <p className="mt-2 text-xs text-dracula-text/70">
              Faça login ou crie uma conta para salvar pedidos, acompanhar status e manter seus códigos guardados.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={loginHref}
                className="rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20] glass-fix transition hover:bg-white/[0.18]"
              >
                Fazer login
              </Link>
              <Link
                href={cadastroHref}
                className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white"
              >
                Criar conta
              </Link>
            </div>
          </Card>
        ) : null}

        {user && error ? (
          <Card>
            <p className="text-sm text-dracula-text">{error}</p>
            <p className="mt-2 text-xs text-dracula-text/70">
              Se isso continuar, tente recarregar a página.
            </p>
          </Card>
        ) : null}

        {user && !loading && !error && rows.length === 0 ? (
          <Card>
            <p className="text-sm text-dracula-text/80">Você ainda não tem pedidos.</p>
          </Card>
        ) : null}

        {user && !loading && !error && rows.length > 0 ? (
          <div className="grid gap-3">
            {rows.map((r) => (
              <Card key={r.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-dracula-text/70">Código</div>
                    <div className="mt-1 font-mono text-lg text-dracula-text">{r.code}</div>
                    <div className="mt-2 text-xs text-dracula-text/70">{r.model_name}</div>
                    <div className="mt-1 text-xs text-dracula-text/70">
                      {r.store_name} • {r.store_address}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-semibold text-dracula-text/70">Total</div>
                    <div className="mt-1 text-base font-semibold text-dracula-text">
                      {formatMoneyBRL(r.total_cents)}
                    </div>
                    <div className="mt-2 text-xs text-dracula-text/70">
                      Status:{" "}
                      <span className="text-base font-bold text-dracula-text">
                        {statusPT(r.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Link
                    href={`/agendamento/confirmado/${encodeURIComponent(r.code)}`}
                    className="text-sm font-semibold text-dracula-accent hover:brightness-95"
                  >
                    Ver detalhes →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </ClientShell>
  );
}
