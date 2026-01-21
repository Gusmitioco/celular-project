import Link from "next/link";
import { apiGet } from "../../../../../../../../lib/api";
import { formatBRLFromCents } from "../../../../../../../../lib/format";

type Props = {
  params: Promise<{ citySlug: string; brandSlug: string; modelId: string }>;
  searchParams: Promise<{ serviceIds?: string }>;
};

type StoreOption = {
  id: number;
  name: string;
  city: string;
  address: string;
  totalCents: number;
  currency: string;
};

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { citySlug, brandSlug, modelId } = await params;
  const { serviceIds } = await searchParams;

  const serviceIdsStr = (serviceIds ?? "").trim();
  const selected = serviceIdsStr
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n));

  if (selected.length === 0) {
    return (
      <main style={{ maxWidth: 720 }}>
        <h1>Escolha a Assistência</h1>
        <p>Nenhum serviço selecionado.</p>
        <Link href={`/city/${citySlug}/brand/${brandSlug}/model/${modelId}`}>← Voltar</Link>
      </main>
    );
  }

  const stores = await apiGet<StoreOption[]>(
    `/stores?citySlug=${encodeURIComponent(citySlug)}&modelId=${encodeURIComponent(
      modelId
    )}&serviceIds=${encodeURIComponent(selected.join(","))}`
  );

  return (
    <main style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href={`/city/${citySlug}/brand/${brandSlug}/model/${modelId}?`}>
          ← Voltar
        </Link>
      </div>

      <h1>Escolha a Assistência</h1>
      <p style={{ opacity: 0.8 }}>
        Serviços selecionados: {selected.join(", ")}
      </p>

      {stores.length === 0 ? (
        <p>Nenhuma assistência encontrada para esses serviços (todas juntas) nesse modelo.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {stores.map((s) => (
            <div
              key={s.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 800 }}>{s.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{s.address}</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {formatBRLFromCents(s.totalCents)}
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <Link
                  href="#"
                  style={{
                    display: "inline-block",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #111",
                    background: "#111",
                    color: "white",
                    textDecoration: "none",
                  }}
                >
                  Selecionar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
