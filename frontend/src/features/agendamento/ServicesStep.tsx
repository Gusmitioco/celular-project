"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { BackButton } from "@/components/ui/BackButton";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { rotas } from "@/lib/rotas";
import { formatBRLFromCents } from "@/lib/money";
import { useAgendamento } from "./AgendamentoProvider";
import { Card } from "@/components/ui/Card";

export function ServicesStep() {
  const router = useRouter();
  const { brand, model, services, toggleService, totalCents, hydrated } = useAgendamento();

  const [available, setAvailable] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!model) return;
    api
      .getModelServices(model.id)
      .then(setAvailable)
      .catch((e: any) => setError(e?.message || "Erro ao carregar serviços"));
  }, [model]);

  React.useEffect(() => {
    // Avoid redirecting before persisted state is loaded (e.g. returning from /login).
    if (!hydrated) return;
    if (!brand || !model) router.push(rotas.agendamento.marca());
  }, [brand, model, router, hydrated]);

  if (!hydrated) {
    return (
      <Card className="ring-white/10">
        <div className="text-sm text-dracula-text/70">Carregando suas escolhas…</div>
      </Card>
    );
  }

  if (!brand || !model) return null;

  const isSelected = (s: any) => services.some((x: any) => x.id === s.id);

  return (
    <section className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Escolha os serviços</h1>
        <p className="mt-2 text-sm text-dracula-text/75">
          {brand.name} • {model.name}
        </p>
        {error ? <div className="mt-3 text-sm text-dracula-accent2">Erro: {error}</div> : null}
      </div>

      <div className="scrollbar-consert max-h-[52vh] overflow-auto pr-2 pt-5 pb-5">
        <div className="-mt-4 -mb-4 grid gap-4 md:grid-cols-2">
          {available.map((s) => {
            const selected = isSelected(s);
            return (
              <ChoiceCard
                key={s.id}
                title={s.name}
                subtitle={formatBRLFromCents(s.priceCents)}
                selected={selected}
                onClick={() => toggleService(s)}
                centerContent={false}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Mobile: Voltar (esq) + Total (dir) e CTA grande abaixo */}
        <div className="flex items-center justify-between md:block">
          <BackButton onClick={() => router.push(rotas.agendamento.modelo())} />
          <div className="text-sm text-dracula-text/75 md:hidden">
            Total: <span className="font-semibold text-dracula-text">{formatBRLFromCents(totalCents)}</span>
          </div>
        </div>

        {/* Desktop: Total + Confirmar alinhados à direita (layout original) */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-sm text-dracula-text/75">
            Total: <span className="font-semibold text-dracula-text">{formatBRLFromCents(totalCents)}</span>
          </div>
          <ConfirmButton
            onClick={() => {
              const wantsScreen = services.some((s) => String(s.name).toLowerCase().includes("troca de tela"));
              router.push(wantsScreen ? rotas.agendamento.tela() : rotas.agendamento.checkout());
            }}
            disabled={services.length === 0}
            title={services.length === 0 ? "Selecione pelo menos 1 serviço para continuar" : undefined}
            label="Confirmar serviços"
          />
        </div>

        {/* Mobile: CTA em evidência */}
        <div className="md:hidden">
          <ConfirmButton
            className="w-full"
            onClick={() => {
              const wantsScreen = services.some((s) => String(s.name).toLowerCase().includes("troca de tela"));
              router.push(wantsScreen ? rotas.agendamento.tela() : rotas.agendamento.checkout());
            }}
            disabled={services.length === 0}
            title={services.length === 0 ? "Selecione pelo menos 1 serviço para continuar" : undefined}
            label="Confirmar serviços"
          />
        </div>
      </div>
    </section>
  );
}
