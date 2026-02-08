import Link from "next/link";
import { StoreScreenPricesClient } from "@/components/StoreScreenPricesClient";

export default function StoreScreenPricesPage() {
  return (
    <main className="container">
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/store" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Preços de tela</h1>
      <p className="sub">Defina os preços da sua loja (toggle desligado = preço 0 / indisponível)</p>

      <StoreScreenPricesClient />
    </main>
  );
}
