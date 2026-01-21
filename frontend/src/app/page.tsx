import Link from "next/link";
import { apiGet } from "../lib/api";
import type { CityItem } from "../types";
import { Stepper } from "../components/Stepper";

export default async function HomePage() {
  const cities = await apiGet<CityItem[]>("/cities");

  return (
    <main className="container">
      <Stepper activeIndex={0} />
      <h1 className="h1">Assistência Técnica</h1>
      <p className="sub">Selecione sua cidade para encontrar os melhores serviços de reparo</p>

      <div className="grid">
        {cities.map((c) => (
          <Link key={c.slug} href={`/city/${c.slug}`} className="cardLink">
            <div>
              <div className="cardTitle">{c.city}</div>
              <div className="cardMeta">Ver assistências disponíveis</div>
            </div>
            <div className="chev">›</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
