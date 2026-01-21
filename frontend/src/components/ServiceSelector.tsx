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
    router.push(`/city/${citySlug}/brand/${brandSlug}/model/${modelId}/checkout?${qs.toString()}`);
  }

  return (
    <div style={{ marginTop: 16 }}>
      {services.map((s) => {
        const checked = selected.has(s.id);
        return (
          <div
            key={s.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="checkbox" checked={checked} onChange={() => toggle(s.id)} />
              <div>
                <div style={{ fontWeight: 600 }}>{s.service}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {s.storeCount} assistências oferecem
                </div>
              </div>
            </label>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>{formatBRLFromCents(s.minPriceCents)}</div>
              {s.maxPriceCents !== s.minPriceCents && (
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  até {formatBRLFromCents(s.maxPriceCents)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <div
        style={{
          borderTop: "1px solid #eee",
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Total mínimo</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{formatBRLFromCents(minTotal)}</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link
            href={`/city/${citySlug}/brand/${brandSlug}`}
            style={{ textDecoration: "none", padding: "10px 12px", border: "1px solid #ddd", borderRadius: 10 }}
          >
            Voltar
          </Link>

          <button
            onClick={goCheckout}
            disabled={selectedIds.length === 0}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #111",
              background: selectedIds.length === 0 ? "#eee" : "#111",
              color: selectedIds.length === 0 ? "#777" : "white",
              cursor: selectedIds.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
