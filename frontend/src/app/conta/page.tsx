"use client";

import React from "react";
import Link from "next/link";

import { ClientShell } from "@/components/layout/ClientShell";
import { Card } from "@/components/ui/Card";
import HomeButton from "@/components/ui/HomeButton";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/services/api";

type Me = Awaited<ReturnType<typeof api.getMe>>;

export default function Page() {
  const { user, isLoading, refresh, logout } = useAuth();

  // Mantém um perfil “completo” (phone etc.) quando o /me retorna mais campos
  const [me, setMe] = React.useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isLoadingAll = isLoading || loadingMe;

  React.useEffect(() => {
    let mounted = true;

    // Se não existe sessão, não tenta carregar detalhes
    if (!user) {
      setMe(null);
      return;
    }

    setLoadingMe(true);
    setError(null);

    (async () => {
      try {
        // Garante que o estado global esteja atualizado
        await refresh();

        const data = await api.getMe();
        if (!mounted) return;
        setMe(data ?? null);
      } catch {
        if (!mounted) return;
        // Se falhar, ainda podemos renderizar pelo menos o que o AuthProvider tem
        setMe(null);
      } finally {
        if (!mounted) return;
        setLoadingMe(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user, refresh]);

  async function onLogout() {
    setError(null);
    try {
      await logout();
      window.location.href = "/";
    } catch (e: any) {
      setError(e?.message ?? "Falha ao sair");
    }
  }

  const anyMe: any = (me ?? user) as any;

  const name = String(anyMe?.name ?? anyMe?.nome ?? "");
  const email = String(anyMe?.email ?? "");
  const phone = String(anyMe?.phone ?? anyMe?.telefone ?? anyMe?.whatsapp ?? "");

  return (
    <ClientShell title="Conta" maxWidthClassName="max-w-4xl">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3">
        <HomeButton />
        <div className="text-right">
          <p className="text-sm text-white/70">Sua conta</p>
        </div>
      </div>

      <Card className="mt-5 p-6">
        {isLoadingAll ? (
          <div className="space-y-3">
            <div className="h-5 w-40 rounded bg-white/10" />
            <div className="h-4 w-80 rounded bg-white/10" />
            <div className="h-4 w-72 rounded bg-white/10" />
          </div>
        ) : !user ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Você não está logado</h2>
              <p className="mt-1 text-sm text-white/70">
                Faça login para salvar pedidos, acompanhar o status e usar o chat em tempo real.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <Link href="/login">
                <Button className="min-w-[140px]" variant="primary">
                  Login
                </Button>
              </Link>
              <Link href="/cadastro">
                <Button className="min-w-[140px]" variant="secondary">
                  Criar conta
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-white">Seus dados</h2>
              <p className="mt-1 text-sm text-white/70">
                Aqui ficam as informações da sua conta. (Edição de senha fica para mais pra frente.)
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs text-white/60">Nome</p>
                <p className="mt-1 text-base font-medium text-white">{name || "—"}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs text-white/60">E-mail</p>
                <p className="mt-1 text-base font-medium text-white break-all">{email || "—"}</p>
              </div>

              <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10 sm:col-span-2">
                <p className="text-xs text-white/60">Telefone / WhatsApp</p>
                <p className="mt-1 text-base font-medium text-white">{phone || "—"}</p>
              </div>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-100 ring-1 ring-red-400/20">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/">
                <Button className="min-w-[140px]" variant="secondary">
                  Início
                </Button>
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-w-[160px] opacity-70 hover:opacity-100 transition-opacity"
                  onClick={() =>
                    setError(
                      "Edição de conta (nome/telefone) entra na próxima etapa — falta endpoint estável no backend."
                    )
                  }
                >
                  Editar conta
                </Button>

                <Button
                  type="button"
                  variant="danger"
                  className="min-w-[140px] transition-all duration-300 hover:-translate-y-[1px]"
                  onClick={onLogout}
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </ClientShell>
  );
}
