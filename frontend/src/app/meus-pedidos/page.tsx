"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ClientShell } from "@/components/layout/ClientShell";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";
import HomeButton from "@/components/ui/HomeButton";
import { Button } from "@/components/ui/Button";
import { api } from "@/services/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { rotas } from "@/lib/rotas";

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
  const router = useRouter();
  const search = useSearchParams();
  const deletedCode = String(search.get("deleted") ?? "").trim();
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
    <ClientShell title="Meus Pedidos" maxWidthClassName="max-w-5xl"
footer={
  <div className="flex items-center justify-between gap-3">
    <BackButton onClick={() => router.back()} />
    <HomeButton className="shrink-0" />
  </div>
}
footerContainerClassName="px-4 py-6 sm:px-6 sm:py-7 lg:px-10 overflow-visible"
>
      <div className="space-y-6 pt-2">
        {deletedCode ? (
          <Card>
            <p className="text-sm text-dracula-text">
              Pedido <span className="font-mono font-semibold">{deletedCode}</span> cancelado com sucesso.
            </p>
            <p className="mt-2 text-xs text-dracula-text/70">
              Se precisar, você pode criar um novo pedido a qualquer momento.
            </p>
            </Card>
        ) : null}
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
                className="rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.12] glass-fix transition hover:bg-white/[0.11]"
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
            <div className="flex flex-col items-start gap-4">
              <div>
                <p className="text-lg font-semibold text-dracula-text">Ainda não tem nada aqui</p>
                <p className="mt-2 text-sm text-dracula-text/70">
                  Quando você confirmar um agendamento, ele vai aparecer nesta lista — com status, código e histórico.
                </p>
                <p className="mt-2 text-sm text-dracula-text/70">
                  Que tal fazer seu primeiro pedido agora? É rapidinho 🙂
                </p>
              </div>

              <Button
                variant="confirm"
                className="shadow-[0_18px_55px_-34px_rgba(255,121,198,0.55)] hover:shadow-[0_24px_66px_-34px_rgba(255,184,108,0.75)] hover:-translate-y-[1px] active:translate-y-[0px]"
                onClick={() => router.push(rotas.agendamento.marca())}
              >
                Fazer um pedido
              </Button>
            </div>
          </Card>
        ) : null}

        {user && !loading && !error && rows.length > 0 ? (
          <div className="grid gap-3">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/meus-pedidos/${encodeURIComponent(r.code)}`}
                className="no-drag group block"
                draggable={false}
              >
                <div className="relative overflow-hidden rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.12] shadow-[0_14px_32px_rgba(0,0,0,0.28)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_52px_rgba(0,0,0,0.36)] group-hover:ring-white/[0.18] active:translate-y-0 active:shadow-[0_12px_30px_rgba(0,0,0,0.32)] p-7">
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <div className="absolute inset-0 bg-[radial-gradient(1200px_520px_at_50%_10%,rgba(255,255,255,0.10),transparent_65%)]" />
                    <div className="absolute -top-24 left-1/2 h-48 w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
                  </div>
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
                        <span className="text-base font-bold text-dracula-text">{statusPT(r.status)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-sm font-semibold text-dracula-accent hover:brightness-95">Ver detalhes →</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </ClientShell>
  );
}
