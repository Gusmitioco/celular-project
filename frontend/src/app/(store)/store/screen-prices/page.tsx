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
      <p className="sub">Defina um override por loja (vazio = usar o preço padrão do admin)</p>

      <StoreScreenPricesClient />
    </main>
  );
}
