import Link from "next/link";
import { AdminModelsClient } from "../../../../components/AdminModelsClient";

export default function AdminModelsPage() {
  return (
    <main className="container">
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Modelos</h1>
      <p className="sub">Cadastrar e editar modelos por marca</p>

      <AdminModelsClient />
    </main>
  );
}
