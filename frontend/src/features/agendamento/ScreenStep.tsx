"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAgendamento } from "./AgendamentoProvider";
import { api } from "@/services/api";
import { rotas } from "@/lib/rotas";
import { formatBRLFromCents } from "@/lib/money";

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

      // ✅ suporta range antigo e preço único novo
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
        setErr(e?.message || "Não foi possível carregar as opções de tela");
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
            Nenhuma opção de tela disponível para este modelo.
          </div>
        )}

        {!loading &&
          rows.map((o) => {
            const selected = String(screenOption?.id ?? "") === String(o.id);

            const priceText =
              o.minPriceCents === o.maxPriceCents
                ? formatBRLFromCents(o.minPriceCents)
                : `${formatBRLFromCents(o.minPriceCents)} – ${formatBRLFromCents(o.maxPriceCents)}`;

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
        <button
          type="button"
          onClick={() => router.push(rotas.agendamento.servicos())}
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
        >
          Voltar
        </button>

        <button
          type="button"
          onClick={() => router.push(rotas.agendamento.checkout())}
          disabled={!screenOption}
          className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
