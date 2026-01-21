import Link from "next/link";
import { apiGet } from "../../../../../../../lib/api";
import type { ServiceItem } from "../../../../../../../types";
import { ServiceSelector } from "../../../../../../../components/ServiceSelector";

type Props = {
  params: Promise<{ citySlug: string; brandSlug: string; modelId: string }>;
};

export default async function ModelPage({ params }: Props) {
  const { citySlug, brandSlug, modelId } = await params;

  const services = await apiGet<ServiceItem[]>(
    `/services?citySlug=${encodeURIComponent(citySlug)}&modelId=${encodeURIComponent(modelId)}`
  );

  return (
    <main style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href={`/city/${citySlug}/brand/${brandSlug}`}>← Voltar</Link>
      </div>

      <h1>Selecione os serviços</h1>

      {services.length === 0 ? (
        <p>Nenhum serviço encontrado para esse modelo nessa cidade.</p>
      ) : (
        <ServiceSelector
          citySlug={citySlug}
          brandSlug={brandSlug}
          modelId={modelId}
          services={services}
        />
      )}
    </main>
  );
}
