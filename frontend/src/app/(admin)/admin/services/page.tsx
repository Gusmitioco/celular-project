import Link from "next/link";
import { AdminServicesClient } from "../../../../components/AdminServicesClient";

export default function AdminServicesPage() {
  return (
    <main className="container">
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Serviços</h1>
      <p className="sub">Cadastrar e editar tipos de reparo</p>

      <AdminServicesClient />
    </main>
  );
}
