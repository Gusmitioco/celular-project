import Link from "next/link";
import { AdminStoresClient } from "../../../../components/AdminStoresClient";

export default function AdminStoresPage() {
  return (
    <main className="container">
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Lojas</h1>
      <p className="sub">Cadastrar e editar lojas</p>

      <AdminStoresClient />
    </main>
  );
}
