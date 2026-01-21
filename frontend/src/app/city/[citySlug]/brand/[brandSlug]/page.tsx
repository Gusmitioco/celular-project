import Link from "next/link";
import { apiGet } from "../../../../../lib/api";
import type { CityItem, BrandItem, ModelItem } from "../../../../../types";

type Props = {
  params: Promise<{ citySlug: string; brandSlug: string }>;
};

export default async function BrandPage({ params }: Props) {
  const { citySlug, brandSlug } = await params;

  // Optional: fetch names for nicer titles
  const cities = await apiGet<CityItem[]>("/cities");
  const selectedCity = cities.find((c) => c.slug === citySlug);

  const brands = await apiGet<BrandItem[]>(`/brands?citySlug=${encodeURIComponent(citySlug)}`);
  const selectedBrand = brands.find((b) => b.slug === brandSlug);

  const models = await apiGet<ModelItem[]>(
    `/models?citySlug=${encodeURIComponent(citySlug)}&brandSlug=${encodeURIComponent(brandSlug)}`
  );

  return (
    <main style={{ maxWidth: 720 }}>
      <div style={{ marginBottom: 8 }}>
        <Link href={`/city/${citySlug}`}>← Voltar</Link>
      </div>

      <h1>{selectedBrand?.brand ?? brandSlug}</h1>
      <p style={{ opacity: 0.8 }}>
        {selectedCity?.city ? `Cidade: ${selectedCity.city}` : "Selecione o modelo"}
      </p>

      {models.length === 0 ? (
        <p>Nenhum modelo encontrado para essa marca nessa cidade.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {models.map((m) => (
            <Link
              key={m.id}
              href={`/city/${citySlug}/brand/${brandSlug}/model/${m.id}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{m.model}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Ver serviços disponíveis</div>
              </div>
              <div style={{ fontSize: 18, opacity: 0.5 }}>›</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
