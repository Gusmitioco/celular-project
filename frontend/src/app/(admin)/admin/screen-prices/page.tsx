import Link from "next/link";
import { Stepper } from "@/components/Stepper";
import { AdminScreenPricesClient } from "@/components/AdminScreenPricesClient";

export default function AdminScreenPricesPage() {
  return (
    <main className="container">
      <Stepper activeIndex={0} />

      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Preços de tela</h1>
      <p className="sub">Editar preços de troca de tela por loja + modelo</p>

      <AdminScreenPricesClient />
    </main>
  );
}
