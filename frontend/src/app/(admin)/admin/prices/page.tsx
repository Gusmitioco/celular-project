import Link from "next/link";
import { Stepper } from "@/components/Stepper";
import { AdminPricesClient } from "../../../../components/AdminPricesClient";

export default function AdminPricesPage() {
  return (
    <main className="container">
      <Stepper activeIndex={0} />

      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Preços</h1>
      <p className="sub">Editar preços por loja + modelo + serviço</p>

      <AdminPricesClient />
    </main>
  );
}
