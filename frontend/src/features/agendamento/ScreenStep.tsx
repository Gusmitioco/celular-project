"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgendamento } from "./AgendamentoProvider";
import { api } from "@/services/api";
import { rotas } from "@/lib/rotas";
import { formatBRLFromCents } from "@/lib/money";

type Opt = {
  id: string;
  label: string;
  minPriceCents: number;
  maxPriceCents: number;
  currency: string;
  storeCount: number;
};

export function ScreenStep() {
  const router = useRouter();
  const { hydrated, model, services, screenOption, setScreenOption } = useAgendamento();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Opt[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const wantsScreen = useMemo(
    () => services.some((s) => String(s.name).toLowerCase().includes("troca de tela")),
    [services]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (!model) {
      router.replace(rotas.agendamento.modelo());
      return;
    }
    if (!wantsScreen) {
      router.replace(rotas.agendamento.checkout());
      return;
    }

    let alive = true;
    setLoading(true);
    setErr(null);
    api
      .getScreenOptionsPublic(model.id)
      .then((r) => {
        if (!alive) return;
        setRows(r as any);
      })
      .catch((e: any) => {
        if (!alive) return;
        setErr(e?.message || "Não foi possível carregar as opções de tela");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [hydrated, model, wantsScreen, router]);

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Escolha a tela</h1>
        <p className="text-sm text-neutral-600">
          Para <span className="font-medium">{model?.name}</span>. O valor pode variar por loja.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      <div className="space-y-2">
        {loading && <div className="text-sm text-neutral-500">Carregando...</div>}

        {!loading && rows.length === 0 && (
          <div className="rounded-lg border bg-white p-4 text-sm text-neutral-600">
            Nenhuma opção de tela cadastrada para este modelo.
          </div>
        )}

        {!loading &&
          rows.map((o) => {
            const selected = String(screenOption?.id) === String(o.id);
            const priceText =
              o.minPriceCents === o.maxPriceCents
                ? formatBRLFromCents(o.minPriceCents)
                : `${formatBRLFromCents(o.minPriceCents)} – ${formatBRLFromCents(o.maxPriceCents)}`;

            return (
              <button
                key={o.id}
                type="button"
                onClick={() => setScreenOption({ id: Number(o.id), label: o.label, priceCents: o.minPriceCents })}
                className={`w-full rounded-lg border bg-white p-4 text-left transition hover:border-neutral-400 ${
                  selected ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium">{o.label}</div>
                    <div className="mt-1 text-xs text-neutral-500">{o.storeCount} loja(s) na cidade</div>
                  </div>
                  <div className="text-sm font-semibold">{priceText}</div>
                </div>
              </button>
            );
          })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push(rotas.agendamento.servicos())}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium"
        >
          Voltar
        </button>

        <button
          type="button"
          onClick={() => router.push(rotas.agendamento.checkout())}
          disabled={!screenOption}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
