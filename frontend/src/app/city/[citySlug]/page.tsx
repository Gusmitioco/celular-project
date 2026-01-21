import Link from "next/link";
import { apiGet } from "../../../lib/api";
import type { BrandItem, CityItem } from "../../../types";
import { Stepper } from "../../../components/Stepper";

type Props = {
  params: Promise<{ citySlug: string }>;
};

export default async function CityPage({ params }: Props) {
  const { citySlug } = await params;

  const cities = await apiGet<CityItem[]>("/cities");
  const selectedCity = cities.find((c) => c.slug === citySlug);

  if (!selectedCity) {
    return (
      <main className="container">
        <Stepper activeIndex={1} />
        <div className="btnRow" style={{ marginTop: 6 }}>
          <Link href="/" className="btn">
            ← Voltar
          </Link>
        </div>

        <h1 className="h2">Cidade não encontrada</h1>
        <p className="sub">Slug: {citySlug}</p>
      </main>
    );
  }

  const brands = await apiGet<BrandItem[]>(
    `/brands?citySlug=${encodeURIComponent(citySlug)}`
  );

  return (
    <main className="container">
      <Stepper activeIndex={1} />

      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/" className="btn">
          ← Trocar cidade
        </Link>
      </div>

      <h1 className="h2">Selecione a marca</h1>
      <p className="sub">Escolha a marca do seu celular</p>

      {brands.length === 0 ? (
        <div className="surface" style={{ padding: 16 }}>
          <p style={{ margin: 0 }}>Nenhuma marca encontrada nessa cidade.</p>
        </div>
      ) : (
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/city/${citySlug}/brand/${b.slug}`}
              className="cardLink"
            >
              <div>
                <div className="cardTitle">{b.brand}</div>
                <div className="cardMeta">Ver modelos disponíveis</div>
              </div>
              <div className="chev">›</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
