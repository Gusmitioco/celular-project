"use client";

import React from "react";
import Link from "next/link";
import { api } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { rotas } from "@/lib/rotas";
import { useAgendamento } from "./AgendamentoProvider";
import { formatBRLFromCents } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function CheckoutStep() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { brand, model, services, totalCents, reset } = useAgendamento();
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  if (!brand || !model || services.length === 0) {
    return (
      <Card className="ring-dracula-accent2/40">
        <div className="text-dracula-text">
          Você precisa completar as etapas anteriores.{" "}
          <Link className="underline text-dracula-accent" href={rotas.agendamento.marca()}>
            Voltar ao início
          </Link>
        </div>
      </Card>
    );
  }

  async function confirm() {
    setError(null);

    // Old behavior: only generate a request/code after the customer is logged in.
    // If auth state is still loading, avoid redirecting prematurely.
    if (authLoading) return;

    // If not logged in, redirect to login and come back to checkout.
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent(rotas.agendamento.checkout())}`);
      return;
    }

    setLoading(true);
    try {
      const order = await api.createOrder({
        modelId: model.id,
        serviceIds: services.map((s) => s.id),
      });
      reset();
      router.push(rotas.agendamento.confirmado(order.id));
    } catch (e: any) {
      setError(e.message || "Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Resumo do pedido</h1>
        <p className="mt-2 text-sm text-dracula-text/75">
          {brand.name} • {model.name}
        </p>
      </div>

      {error ? <div className="text-sm text-dracula-accent2">Erro: {error}</div> : null}

      <Card>
        <div className="text-sm text-dracula-text/70">Serviços selecionados</div>
        <div className="mt-3 space-y-2">
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-dracula-text">{s.name}</span>
              <span className="font-semibold text-dracula-text">{formatBRLFromCents(s.priceCents)}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4 flex items-center justify-between">
          <span className="text-sm text-dracula-text/70">Total</span>
          <span className="text-lg font-semibold text-dracula-text">{formatBRLFromCents(totalCents)}</span>
        </div>
      </Card>

      <Card>
        {user ? (
          <div className="space-y-2">
            <div className="text-sm text-dracula-text/80">
              Você já está logado{user.name ? (
                <>
                  {" "}como <span className="font-semibold text-dracula-text">{user.name}</span>.
                </>
              ) : (
                "."
              )}
            </div>
            <div className="text-sm text-dracula-text/70">
              Depois de confirmar o pedido, você poderá acompanhar o andamento e usar o chat em tempo real em{" "}
              <Link href="/meus-pedidos" className="font-semibold text-dracula-accent hover:underline">
                Meus Pedidos
              </Link>
              .
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm text-dracula-text/80">
              Faça login com sua conta ou crie um cadastro para desbloquear todas as vantagens da ConSERTE FÁCIL:
              <span className="text-dracula-text/70">
                {" "}chat em tempo real, acompanhar o andamento do conserto, salvar seus pedidos, acessar pedidos antigos e manter seus códigos guardados.
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Login (igual ao do header) */}
              <Link
                href={`/login?returnTo=${encodeURIComponent(rotas.agendamento.checkout())}`}
                className="inline-flex items-center justify-center rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20] glass-fix transition hover:bg-white/[0.18]"
                aria-label="Login"
              >
                Login
              </Link>

              {/* Cadastro (inverso): fundo branco + texto escuro */}
              <Link
                href={`/cadastro?returnTo=${encodeURIComponent(rotas.agendamento.checkout())}`}
                className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white"
                aria-label="Cadastro"
              >
                Cadastro
              </Link>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <BackButton onClick={() => router.push(rotas.agendamento.servicos())} />

          <ConfirmButton
            disabled={loading || authLoading}
            onClick={confirm}
            label={loading ? "Confirmando..." : authLoading ? "Carregando..." : "Confirmar pedido"}
          />
        </div>
      </Card>
    </section>
  );
}
