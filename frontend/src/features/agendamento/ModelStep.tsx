"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { rotas } from "@/lib/rotas";
import { useAgendamento } from "./AgendamentoProvider";
import type { Model } from "@/types/api";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { BackButton } from "@/components/ui/BackButton";
import { Card } from "@/components/ui/Card";

export function ModelStep() {
  const router = useRouter();
  const { brand, setModel, hydrated } = useAgendamento();

  const [models, setModels] = React.useState<Model[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [flashId, setFlashId] = React.useState<string | null>(null);
  const flashTimer = React.useRef<number | null>(null);
  const navTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Avoid redirecting before persisted state is loaded (e.g. returning from /login).
    if (!hydrated) return;
    if (!brand) {
      router.replace(rotas.agendamento.marca());
      return;
    }

    api
      // Backend expects brandSlug (string), not the numeric brand ID.
      // Our Brand object always includes a slug; fall back to id only for legacy stored state.
      .listModels(brand.slug || brand.id)
      .then(setModels)
      .catch((e: any) => setError(e?.message || "Erro ao carregar modelos"));
  }, [brand, router, hydrated]);


  React.useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      if (navTimer.current) window.clearTimeout(navTimer.current);
    };
  }, []);

  if (!hydrated) {
    return (
      <Card className="ring-white/10">
        <div className="text-sm text-dracula-text/70">Carregando suas escolhas…</div>
      </Card>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Escolha o modelo</h1>
        <p className="mt-2 max-w-2xl text-sm text-dracula-text/75">
          Marca selecionada: <span className="font-semibold text-dracula-accent" style={{ textShadow: "0 0 10px rgba(80,250,123,0.35)" }}>{brand?.name}</span>
        </p>
      </div>

      {error ? <div className="mb-4 text-sm text-dracula-accent2">Erro: {error}</div> : null}

      <div className="max-h-[52vh] overflow-auto pr-2 pt-5 pb-5">
        <div className="-mt-4 -mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {models.map((m) => (
            <ChoiceCard
              key={m.id}
              flash={flashId === m.id}
              title={m.name}
              onClick={() => {
                // feedback visual rápido antes de avançar automaticamente
                setFlashId(m.id);
                if (flashTimer.current) window.clearTimeout(flashTimer.current);
                // mantém o flash um pouco mais para o olho perceber antes de trocar de tela
                flashTimer.current = window.setTimeout(() => setFlashId(null), 320);

                setModel(m);

                if (navTimer.current) window.clearTimeout(navTimer.current);
                navTimer.current = window.setTimeout(() => {
                  router.push(rotas.agendamento.servicos());
                }, 180);
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-start">
        <BackButton onClick={() => router.push(rotas.agendamento.marca())} />
      </div>
    </section>
  );
}
