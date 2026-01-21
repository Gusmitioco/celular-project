import Link from "next/link";
import { apiGet } from "../../../../../../../../lib/api";
import { formatBRLFromCents } from "../../../../../../../../lib/format";
import { Stepper } from "../../../../../../../../components/Stepper";
import type { ServiceItem } from "../../../../../../../../types";

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
  const selectedIds = serviceIdsStr
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n));

  if (selectedIds.length === 0) {
    return (
      <main className="container">
        <Stepper activeIndex={4} />
        <h1 className="h2">Escolha a assistência</h1>
        <p className="sub">Nenhum serviço selecionado.</p>
        <Link href={`/city/${citySlug}/brand/${brandSlug}/model/${modelId}`} className="btn">
          ← Voltar
        </Link>
      </main>
    );
  }

  // Fetch all services for this city+model and filter to selected to show a summary
  const allServices = await apiGet<ServiceItem[]>(
    `/services?citySlug=${encodeURIComponent(citySlug)}&modelId=${encodeURIComponent(modelId)}`
  );
  const selectedServices = allServices.filter((s) => selectedIds.includes(s.id));
  const minTotal = selectedServices.reduce((acc, s) => acc + s.minPriceCents, 0);

  const stores = await apiGet<StoreOption[]>(
    `/stores?citySlug=${encodeURIComponent(citySlug)}&modelId=${encodeURIComponent(
      modelId
    )}&serviceIds=${encodeURIComponent(selectedIds.join(","))}`
  );

  return (
    <main className="container">
      <Stepper activeIndex={4} />

      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href={`/city/${citySlug}/brand/${brandSlug}/model/${modelId}`} className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Escolha a Assistência</h1>
      <p className="sub">Selecione onde deseja realizar o serviço</p>

      {/* Stores */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Assistências disponíveis</div>

        {stores.length === 0 ? (
          <div className="surface" style={{ padding: 16 }}>
            <p style={{ margin: 0 }}>
              Nenhuma assistência encontrada que ofereça todos esses serviços para esse modelo.
            </p>
          </div>
        ) : (
          <div className="grid">
            {stores.map((s) => (
              <div key={s.id} className="surface" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{s.name}</div>
                    <div className="cardMeta">{s.address}</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{formatBRLFromCents(s.totalCents)}</div>
                </div>

                <div style={{ marginTop: 12 }}>
                  {/* Placeholder action (no JS handler in Server Component) */}
                  <Link href="#" className="btn btnPrimary" style={{ display: "inline-flex" }}>
                    Selecionar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
