"use client";

import React from "react";
import Link from "next/link";
import { api } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { rotas } from "@/lib/rotas";
import { useAgendamento } from "./AgendamentoProvider";
import { saveAgendamento } from "./agendamentoStore";
import { formatBRLFromCents } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function CheckoutStep() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { brand, model, services, totalCents, reset, hydrated } = useAgendamento();
  const [error, setError] = React.useState<string | null>(null);
  const [limitInfo, setLimitInfo] = React.useState<{ max: number } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [redirecting, setRedirecting] = React.useState(false);
  const navigatingRef = React.useRef(false);

  // Extra safety: persist current draft before sending the user to /login or /cadastro.
  const persistDraftNow = React.useCallback(() => {
    try {
      saveAgendamento({ brand, model, services });
    } catch {
      // ignore
    }
  }, [brand, model, services]);

  // Avoid flashing the "missing steps" banner for a split-second when coming
  // back from /login or /cadastro. If something is missing, immediately
  // redirect to the correct step and render a neutral loading state.
  React.useEffect(() => {
    if (!hydrated) return;
    if (navigatingRef.current) return;

    if (!brand) {
      setRedirecting(true);
      router.replace(rotas.agendamento.marca());
      return;
    }
    if (!model) {
      setRedirecting(true);
      router.replace(rotas.agendamento.modelo());
      return;
    }
    if (services.length === 0) {
      setRedirecting(true);
      router.replace(rotas.agendamento.servicos());
      return;
    }

    setRedirecting(false);
  }, [hydrated, brand, model, services.length, router]);

  // When returning from /login or /cadastro, the provider needs a tick to restore persisted state.
  // Don't show "missing steps" or force the user to restart before we are hydrated.
  if (!hydrated || redirecting) {
    return (
      <Card className="ring-white/10">
        <div className="text-sm text-dracula-text/70">Carregando seu pedido…</div>
      </Card>
    );
  }

  // If something is missing, we'll have redirected in the effect above.
  // Render a neutral loading state (never the error banner) to avoid flashes.
  if (!brand || !model || services.length === 0) {
    return (
      <Card className="ring-white/10">
        <div className="text-sm text-dracula-text/70">Carregando seu pedido…</div>
      </Card>
    );
  }

  async function confirm() {
    setError(null);
    setLimitInfo(null);

    // Old behavior: only generate a request/code after the customer is logged in.
    // If auth state is still loading, avoid redirecting prematurely.
    if (authLoading) return;

    // If not logged in, redirect to login and come back to checkout.
    if (!user) {
      // Ensure the in-progress selection is persisted before leaving the flow.
      persistDraftNow();
      router.push(`/login?returnTo=${encodeURIComponent(rotas.agendamento.checkout())}`);
      return;
    }

    setLoading(true);
    try {
      const order = await api.createOrder({
        modelId: model.id,
        serviceIds: services.map((s) => s.id),
      });
      // Prevent the "missing steps" guard from firing while we navigate away.
      navigatingRef.current = true;
      setRedirecting(true);
      // After finishing (creating) a request, take the user straight to the order area.
      // This matches the classic UX: confirm -> go to the request thread.
      router.push(`/meus-pedidos/${encodeURIComponent(order.id)}`);
      // Clear the in-progress draft only after we started navigating away.
      reset();
    } catch (e: any) {
      const body = e?.bodyJson ?? null;

      // If an identical "created" request already exists, just reuse it and redirect.
      // (This matches the classic UX: no new code, take user to the existing order.)
      if (body?.error === "duplicate_created" && body?.code) {
        navigatingRef.current = true;
        setRedirecting(true);
        router.push(`/meus-pedidos/${encodeURIComponent(String(body.code))}`);
        reset();
        return;
      }

      // Friendly UX for the "max created requests" rule.
      if (body?.error === "created_limit_reached") {
        const max = Number(body?.max ?? 5);
        setLimitInfo({ max: Number.isFinite(max) ? max : 5 });
        return;
      }

      setError(e?.message || "Erro ao criar pedido");
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

      {limitInfo ? (
        <Card className="ring-white/10">
          <div className="text-sm font-semibold text-dracula-text">Limite de pedidos abertos</div>
          <p className="mt-2 text-sm text-dracula-text/75">
            Você já tem <span className="font-semibold text-dracula-text">{limitInfo.max} pedidos abertos</span>.
            Para criar um novo pedido, aguarde a loja iniciar o atendimento (o status muda) ou finalize/cancele um dos pedidos atuais.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/meus-pedidos"
              className="inline-flex items-center justify-center rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white"
            >
              Ver meus pedidos
            </Link>
            <button
              type="button"
              onClick={() => {
                setLimitInfo(null);
                setError(null);
              }}
              className="inline-flex items-center justify-center rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.12] glass-fix transition hover:bg-white/[0.11]"
            >
              Entendi
            </button>
          </div>
        </Card>
      ) : error ? (
        <div className="text-sm text-dracula-accent2">Erro: {error}</div>
      ) : null}

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
                onClick={persistDraftNow}
                className="inline-flex items-center justify-center rounded-xl bg-white/[0.08] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.12] glass-fix transition hover:bg-white/[0.11]"
                aria-label="Login"
              >
                Login
              </Link>

              {/* Cadastro (inverso): fundo branco + texto escuro */}
              <Link
                href={`/cadastro?returnTo=${encodeURIComponent(rotas.agendamento.checkout())}`}
                onClick={persistDraftNow}
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
