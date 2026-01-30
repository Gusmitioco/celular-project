"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { BackButton } from "@/components/ui/BackButton";
import { rotas } from "@/lib/rotas";
import { useAgendamento } from "./AgendamentoProvider";

export function BrandStep() {
  const router = useRouter();
  const { setBrand } = useAgendamento();

  const [brands, setBrands] = React.useState<
    ReturnType<typeof api.listBrands> extends Promise<infer T> ? T : never
  >([] as any);
  const [error, setError] = React.useState<string | null>(null);

  const [flashId, setFlashId] = React.useState<string | null>(null);
  const flashTimer = React.useRef<number | null>(null);
  const navTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    api
      .listBrands()
      .then(setBrands)
      .catch((e: any) => setError(e?.message || "Erro ao carregar marcas"));
  }, []);


  React.useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      if (navTimer.current) window.clearTimeout(navTimer.current);
    };
  }, []);

  return (
    <section className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Escolha a marca</h1>
        <p className="mt-2 max-w-2xl text-sm text-dracula-text/75">Clique e avance automaticamente.</p>
      </div>

      {error ? <div className="mb-4 text-sm text-dracula-accent2">Erro: {error}</div> : null}

      <div className="max-h-[52vh] overflow-auto pr-2 pt-5 pb-5">
        <div className="-mt-4 -mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((b: any) => (
            <ChoiceCard
              key={b.id}
              flash={flashId === b.id}
              title={b.name}
              onClick={() => {
                // feedback visual rápido antes de avançar automaticamente
                setFlashId(b.id);
                if (flashTimer.current) window.clearTimeout(flashTimer.current);
                // mantém o flash um pouco mais para o olho perceber antes de trocar de tela
                flashTimer.current = window.setTimeout(() => setFlashId(null), 320);

                setBrand(b);

                if (navTimer.current) window.clearTimeout(navTimer.current);
                navTimer.current = window.setTimeout(() => {
                  router.push(rotas.agendamento.modelo());
                }, 180);
              }}
            />
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-start">
        <BackButton onClick={() => router.push(rotas.home())} />
      </div>
    </section>
  );
}
