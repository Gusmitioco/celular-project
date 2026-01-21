import Link from "next/link";
import { apiGet } from "../../../../../lib/api";
import type { BrandItem, CityItem, ModelItem } from "../../../../../types";
import { Stepper } from "../../../../../components/Stepper";

type Props = {
  params: Promise<{ citySlug: string; brandSlug: string }>;
};

export default async function BrandPage({ params }: Props) {
  const { citySlug, brandSlug } = await params;

  const cities = await apiGet<CityItem[]>("/cities");
  const selectedCity = cities.find((c) => c.slug === citySlug);

  const brands = await apiGet<BrandItem[]>(`/brands?citySlug=${encodeURIComponent(citySlug)}`);
  const selectedBrand = brands.find((b) => b.slug === brandSlug);

  const models = await apiGet<ModelItem[]>(
    `/models?citySlug=${encodeURIComponent(citySlug)}&brandSlug=${encodeURIComponent(brandSlug)}`
  );

  return (
    <main className="container">
      <Stepper activeIndex={2} />

      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href={`/city/${citySlug}`} className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">{selectedBrand?.brand ?? brandSlug}</h1>
      <p className="sub">
        {selectedCity?.city ? `Cidade: ${selectedCity.city}` : "Selecione o modelo do seu aparelho"}
      </p>

      {models.length === 0 ? (
        <div className="surface" style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>Nenhum modelo encontrado para essa marca nessa cidade.</p>
        </div>
      ) : (
        <div className="grid" style={{ marginTop: 14 }}>
          {models.map((m) => (
            <Link
              key={m.id}
              href={`/city/${citySlug}/brand/${brandSlug}/model/${m.id}`}
              className="cardLink"
            >
              <div>
                <div className="cardTitle">{m.model}</div>
                <div className="cardMeta">Ver serviços disponíveis</div>
              </div>
              <div className="chev">›</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
