import Link from "next/link";
import { AdminStoreModelsClient } from "@/components/AdminStoreModelsClient";

export default function AdminStoreModelsPage() {
  return (
    <main className="container">
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Modelos por loja</h1>
      <p className="sub">Escolha quais modelos cada loja atende</p>

      <AdminStoreModelsClient />
    </main>
  );
}
