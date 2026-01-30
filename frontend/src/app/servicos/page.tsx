"use client";

import React from "react";
import Link from "next/link";
import { api, Service } from "@/services/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatBRLFromCents } from "@/lib/money";
import { rotas } from "@/lib/rotas";

export default function ServicosPage() {
  const [items, setItems] = React.useState<Service[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .listServices()
      .then(setItems)
      .catch((e: any) => setError(e?.message || "Erro ao carregar serviços"));
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mb-8 flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Serviços</h1>
        <p className="max-w-2xl text-sm text-dracula-text/75">
          Confira os serviços mais comuns. Para receber um valor exato e disponibilidade, inicie o agendamento e selecione a marca e o modelo.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button onClick={() => (window.location.href = rotas.agendamento.marca())}>Começar agendamento</Button>
          <Link
            href={rotas.home()}
            className="rounded-2xl bg-white/[0.14] px-5 py-3 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20]  glass-fix transition hover:bg-white/[0.18]"
          >
            Voltar para Home
          </Link>
        </div>
        {error ? <div className="text-sm text-dracula-accent2">Erro: {error}</div> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {items.map((s) => (
          <Card key={s.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-base font-semibold text-dracula-text">{s.name}</div>
                <div className="mt-1 text-sm text-dracula-text/70">{formatBRLFromCents(s.priceCents)}</div>
              </div>
              <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-dracula-text/70 ring-1 ring-white/10">
                estimativa
              </div>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
