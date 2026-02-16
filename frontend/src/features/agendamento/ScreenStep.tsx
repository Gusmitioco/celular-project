"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgendamento } from "./AgendamentoProvider";
import { api } from "@/services/api";
import { rotas } from "@/lib/rotas";
import { formatBRLFromCents } from "@/lib/money";
// O StepsNav é renderizado no layout de /agendamento (AgendamentoClientLayout).
// Não renderizamos aqui para evitar duplicidade.
import { BackButton } from "@/components/ui/BackButton";
import { ConfirmButton } from "@/components/ui/ConfirmButton";

type Opt = {
  id: string | number;
  label: string;
  minPriceCents: number;
  maxPriceCents: number;
  currency: string;
  storeCount: number;
};

function normalizeOptions(resp: any): Opt[] {
  const arr = Array.isArray(resp)
    ? resp
    : Array.isArray(resp?.rows)
      ? resp.rows
      : Array.isArray(resp?.options)
        ? resp.options
        : [];

  return arr
    .map((x: any) => {
      const id = x?.id ?? x?.screen_option_id ?? "";
      const label = String(x?.label ?? "");

      // â suporta range antigo e preÃ§o Ãºnico novo
      const priceSingle =
        x?.priceCents ?? x?.price_cents ?? x?.store_price_cents ?? null;

      const min =
        x?.minPriceCents ?? x?.min_price_cents ?? (priceSingle != null ? priceSingle : 0);
      const max =
        x?.maxPriceCents ??
        x?.max_price_cents ??
        (priceSingle != null ? priceSingle : min);

      const currency = String(x?.currency ?? "BRL");
      const storeCount = Number(x?.storeCount ?? x?.store_count ?? 0);

      return {
        id,
        label,
        minPriceCents: Number(min) || 0,
        maxPriceCents: Number(max) || 0,
        currency,
        storeCount,
      } as Opt;
    })
    .filter((o: Opt) => String(o.id).trim() !== "" && o.label.trim() !== "");
}

export function ScreenStep() {
  const router = useRouter();
  const { hydrated, model, services, screenOption, setScreenOption } = useAgendamento();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Opt[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const wantsScreen = useMemo(() => {
    return (services ?? []).some((s: any) =>
      String(s?.name ?? "").toLowerCase().includes("troca de tela")
    );
  }, [services]);

  const modelIdStr = model?.id != null ? String(model.id) : null;

  useEffect(() => {
    if (!hydrated) return;

    if (!modelIdStr) {
      router.replace(rotas.agendamento.modelo());
      return;
    }

    if (!wantsScreen) {
      router.replace(rotas.agendamento.checkout());
      return;
    }

    let alive = true;

    async function run(mid: string) {
      setLoading(true);
      setErr(null);

      try {
        const resp = await api.getScreenOptionsPublic(mid);
        if (!alive) return;

        const options = normalizeOptions(resp);
        setRows(options);
      } catch (e: any) {
        if (!alive) return;
        setRows([]);
        setErr(e?.message || "NÃ£o foi possÃ­vel carregar as opÃ§Ãµes de tela");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    run(modelIdStr);

    return () => {
      alive = false;
    };
  }, [hydrated, modelIdStr, wantsScreen, router]);

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* MantÃ©m o marcador de etapas igual ao da pÃ¡gina de ServiÃ§os */}

      <div className="mb-4">
        <h1 className="text-xl font-semibold">Escolha a tela</h1>
        <p className="text-sm text-neutral-200">
          Para <span className="font-medium text-white">{model?.name}</span>.
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="space-y-2">
        {loading && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Carregando...
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            Nenhuma opção de tela disponi­vel para este modelo.
          </div>
        )}

        {!loading &&
          rows.map((o) => {
            const selected = String(screenOption?.id ?? "") === String(o.id);

            const priceText =
              o.minPriceCents === o.maxPriceCents
                ? formatBRLFromCents(o.minPriceCents)
                : `${formatBRLFromCents(o.minPriceCents)} â ${formatBRLFromCents(o.maxPriceCents)}`;

            return (
              <button
                key={`opt-${String(o.id)}`}
                type="button"
                onClick={() =>
                  setScreenOption({
                    id: Number(o.id),
                    label: o.label,
                    priceCents: o.minPriceCents,
                  })
                }
                className={`w-full rounded-lg border p-4 text-left transition ${
                  selected
                    ? "border-white/60 bg-white/10 ring-1 ring-white/40"
                    : "border-white/10 bg-white/5 hover:border-white/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white">{o.label}</div>
                    {o.storeCount ? (
                      <div className="mt-1 text-xs text-white/70">{o.storeCount} loja(s)</div>
                    ) : null}
                  </div>
                  <div className="text-sm font-semibold text-white">{priceText}</div>
                </div>
              </button>
            );
          })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {/* Voltar: mesmo botÃ£o padrÃ£o do projeto */}
        <BackButton onClick={() => router.push(rotas.agendamento.servicos())} />

        {/* Continuar: mesmo estilo do "Confirmar serviÃ§os" */}
        <ConfirmButton
          onClick={() => router.push(rotas.agendamento.checkout())}
          disabled={!screenOption}
        >
          Continuar
        </ConfirmButton>
      </div>
    </div>
  );
}
