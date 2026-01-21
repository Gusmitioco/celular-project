import Link from "next/link";
import { apiGet } from "../lib/api";
import type { CityItem } from "../types";

export default async function HomePage() {
  const cities = await apiGet<CityItem[]>("/cities");

  return (
    <main style={{ maxWidth: 720 }}>
      <h1>Selecione sua cidade</h1>

      {cities.length === 0 ? (
        <p>Nenhuma cidade encontrada. Cadastre lojas no banco de dados.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {cities.map((c) => (
            <Link
              key={c.slug}
              href={`/city/${c.slug}`}
              style={{
                border: "1px solid #ddd",
                borderRadius: 12,
                padding: 16,
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 600 }}>{c.city}</div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{c.slug}</div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
