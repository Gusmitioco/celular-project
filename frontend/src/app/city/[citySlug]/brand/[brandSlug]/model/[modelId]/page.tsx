import Link from "next/link";
import { apiGet } from "../../../../../../../lib/api";
import type { ServiceItem } from "../../../../../../../types";
import { Stepper } from "../../../../../../../components/Stepper";
import { ServiceSelector } from "../../../../../../../components/ServiceSelector";

type Props = {
  params: Promise<{ citySlug: string; brandSlug: string; modelId: string }>;
};

export default async function ModelServicesPage({ params }: Props) {
  const { citySlug, brandSlug, modelId } = await params;

  const services = await apiGet<ServiceItem[]>(
    `/services?citySlug=${encodeURIComponent(citySlug)}&modelId=${encodeURIComponent(modelId)}`
  );

  return (
    <main className="container">
      <Stepper activeIndex={3} />

      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href={`/city/${citySlug}/brand/${brandSlug}`} className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Selecione os serviços</h1>
      <p className="sub">Escolha quais reparos você precisa</p>

      {services.length === 0 ? (
        <div className="surface" style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>Nenhum serviço encontrado para esse modelo nessa cidade.</p>
        </div>
      ) : (
        <ServiceSelector citySlug={citySlug} brandSlug={brandSlug} modelId={modelId} services={services} />
      )}
    </main>
  );
}
