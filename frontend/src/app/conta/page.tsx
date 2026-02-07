"use client";

import React from "react";

import { ClientShell } from "@/components/layout/ClientShell";
import { Card } from "@/components/ui/Card";
import HomeButton from "@/components/ui/HomeButton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/services/api";
import { formatBRPhone } from "@/lib/phone";

type Me = Awaited<ReturnType<typeof api.getMe>>;

export default function Page() {
  const { user, isLoading, logout } = useAuth();

  const [me, setMe] = React.useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const userId = user?.id ?? null;

  React.useEffect(() => {
    let mounted = true;

    if (!userId) {
      setMe(null);
      setError(null);
      setLoadingMe(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingMe(true);
    setError(null);

    (async () => {
      try {
        const data = await api.getMe();
        if (!mounted) return;
        setMe(data ?? null);
      } catch {
        if (!mounted) return;
        setMe(null);
        setError("Não foi possível carregar seus dados. Tente atualizar a página.");
      } finally {
        if (!mounted) return;
        setLoadingMe(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const onLogout = async () => {
    try {
      await logout();
    } catch {
      // silent
    }
  };

  const isLoadingAll = isLoading || loadingMe;

  const name = (me as any)?.name ?? user?.name ?? "—";
  const email = (me as any)?.email ?? user?.email ?? "—";
  const phoneRaw = (me as any)?.phone ?? (me as any)?.whatsapp ?? (me as any)?.telefone ?? "";
  const phone = phoneRaw ? formatBRPhone(String(phoneRaw)) : "—";

  return (
    <ClientShell
      title="Conta"
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Conta
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Gerencie seus dados e preferências.
            </p>
          </div>

          <span className="select-none rounded-full bg-white/[0.10] px-3 py-1 text-xs text-white/70 ring-1 ring-white/[0.14]">
            Sua conta
          </span>
        </div>
      }
      footer={
        // No mobile a barra de ações estava estourando/ficando "espalhada".
        // Em telas pequenas: empilha e deixa botões com largura total.
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <HomeButton href="/" className="w-full sm:w-auto sm:min-w-[150px]" />

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto sm:min-w-[160px] rounded-2xl bg-white/[0.10] text-white ring-1 ring-white/[0.14] hover:bg-white/[0.14] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_0_0_6px_rgba(255,255,255,0.14)] transition"
              onClick={() => (window.location.href = "/conta/editar")}
            >
              Editar conta
            </Button>

            <Button
              type="button"
              variant="danger"
              className="w-full sm:w-auto sm:min-w-[140px] rounded-2xl bg-red-900/60 text-white ring-1 ring-red-300/20 hover:bg-red-600 hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_0_0_6px_rgba(239,68,68,0.18),0_18px_55px_-30px_rgba(239,68,68,0.9)] transition-all duration-300"
              onClick={onLogout}
            >
              Sair
            </Button>
          </div>
        </div>
      }
      footerContainerClassName="px-4 pb-6 sm:px-6 sm:pb-7 lg:px-10 overflow-visible"
      maxWidthClassName="max-w-6xl"
    >
      <Card className="relative overflow-hidden rounded-3xl bg-white/[0.08] ring-1 ring-white/[0.14] shadow-[0_30px_90px_-55px_rgba(0,0,0,0.75)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-[2px] opacity-70"
          style={{
            background:
              "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 28%, rgba(168,85,247,0.10) 62%, rgba(0,0,0,0) 100%)",
          }}
        />

        <div className="relative p-6 sm:p-8">
          {isLoadingAll ? (
            <div className="space-y-4">
              <div className="h-6 w-44 rounded-lg bg-white/10" />
              <div className="h-4 w-72 rounded-lg bg-white/10" />
              <div className="h-4 w-64 rounded-lg bg-white/10" />
              <div className="h-12 w-full rounded-2xl bg-white/10" />
            </div>
          ) : !user ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Você não está logado
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Faça login para salvar pedidos, acompanhar o status e usar o
                  chat em tempo real.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  className="min-w-[160px] rounded-2xl bg-white/[0.12] text-white ring-1 ring-white/[0.16] hover:bg-white/[0.16] hover:-translate-y-[1px] active:translate-y-[1px] transition"
                  onClick={() => (window.location.href = "/login")}
                >
                  Login
                </Button>

                <Button
                  variant="secondary"
                  className="min-w-[160px] rounded-2xl bg-white/[0.08] text-white ring-1 ring-white/[0.14] hover:bg-white/[0.12] hover:-translate-y-[1px] active:translate-y-[1px] transition"
                  onClick={() => (window.location.href = "/cadastro")}
                >
                  Criar conta
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-white">Seus dados</h2>
                <p className="mt-1 text-sm text-white/70">
                  Aqui ficam as informações da sua conta. (Edição de senha fica
                  para mais pra frente.)
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.10] backdrop-blur-md">
                  <p className="text-xs text-white/60">Nome</p>
                  <p className="mt-1 text-base font-medium text-white">
                    {name}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.10] backdrop-blur-md">
                  <p className="text-xs text-white/60">E-mail</p>
                  <p className="mt-1 text-base font-medium text-white break-all">
                    {email}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/[0.10] backdrop-blur-md sm:col-span-2">
                  <p className="text-xs text-white/60">Telefone / WhatsApp</p>
                  <p className="mt-1 text-base font-medium text-white">
                    {phone}
                  </p>
                </div>
              </div>

              {error ? (
                <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/20">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </ClientShell>
  );
}
