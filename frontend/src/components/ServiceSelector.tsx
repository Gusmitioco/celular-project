"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBRLFromCents } from "../lib/format";
import type { ServiceItem } from "../types";

type Props = {
  citySlug: string;
  brandSlug: string;
  modelId: string;
  services: ServiceItem[];
};

export function ServiceSelector({ citySlug, brandSlug, modelId, services }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const selectedIds = useMemo(() => Array.from(selected.values()).sort((a, b) => a - b), [selected]);

  const minTotal = useMemo(() => {
    return services
      .filter((s) => selected.has(s.id))
      .reduce((acc, s) => acc + s.minPriceCents, 0);
  }, [services, selected]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goCheckout() {
    const qs = new URLSearchParams();
    qs.set("serviceIds", selectedIds.join(","));
    router.push(`/cidade/${citySlug}/marca/${brandSlug}/modelo/${modelId}/checkout?${qs.toString()}`);
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="surface" style={{ padding: 16 }}>
        <div className="grid" style={{ gap: 12 }}>
          {services.map((s) => {
            const checked = selected.has(s.id);
            return (
              <div
                key={s.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} />
                  <div>
                    <div className="cardTitle">{s.service}</div>
                    <div className="cardMeta">{s.storeCount} assistências oferecem</div>
                  </div>
                </label>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900 }}>{formatBRLFromCents(s.minPriceCents)}</div>
                  {s.maxPriceCents !== s.minPriceCents && (
                    <div className="cardMeta">até {formatBRLFromCents(s.maxPriceCents)}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border)",
            marginTop: 14,
            paddingTop: 14,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div className="cardMeta">Total mínimo</div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>{formatBRLFromCents(minTotal)}</div>
          </div>

          <div className="btnRow">
            <Link href={`/cidade/${citySlug}/brand/${brandSlug}`} className="btn">
              Voltar
            </Link>

            <button
              onClick={goCheckout}
              disabled={selectedIds.length === 0}
              className={`btn btnPrimary ${selectedIds.length === 0 ? "btnDisabled" : ""}`}
              type="button"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
