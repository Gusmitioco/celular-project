import Link from "next/link";
import { AdminSecurityClient } from "../../../../components/AdminSecurityClient";

export default function AdminSecurityPage() {
  return (
    <main className="container">
      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Segurança</h1>
      <p className="sub">Ações de emergência (logout de lojas)</p>

      <AdminSecurityClient />
    </main>
  );
}
