import Link from "next/link";
import { apiGet } from "../../../lib/api";
import type { BrandItem, CityItem } from "../../../types";

type Props = {
  params: Promise<{ citySlug: string }>;
};

export default async function CityPage({ params }: Props) {
  const { citySlug } = await params;

  const cities = await apiGet<CityItem[]>("/cities");
  const selectedCity = cities.find((c) => c.slug === citySlug);

  if (!selectedCity) {
    return (
      <main style={{ maxWidth: 720 }}>
        <pre>{JSON.stringify({ citySlug }, null, 2)}</pre>
        <h1>Cidade não encontrada</h1>
        <p>Slug: {citySlug}</p>
        <Link href="/">Voltar</Link>
      </main>
    );
  }

  const brands = await apiGet<BrandItem[]>(
    `/brands?citySlug=${encodeURIComponent(citySlug)}`
  );

  return (
    <main style={{ maxWidth: 720 }}>
      <h1>{selectedCity.city}</h1>
      <p style={{ opacity: 0.8 }}>Selecione a marca do seu aparelho</p>

      {brands.length === 0 ? (
        <p>Nenhuma marca encontrada nessa cidade.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/city/${citySlug}/brand/${b.slug}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 600 }}>{b.brand}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{b.slug}</div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Link href="/">← Trocar cidade</Link>
      </div>
    </main>
  );
}
