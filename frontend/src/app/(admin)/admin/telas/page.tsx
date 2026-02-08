import Link from "next/link";
import { Stepper } from "@/components/Stepper";
import { AdminScreenOptionsClient } from "@/components/AdminScreenOptionsClient";

export default function AdminTelasPage() {
  return (
    <main className="container">
      <Stepper activeIndex={0} />

      <div className="btnRow" style={{ marginTop: 6 }}>
        <Link href="/admin" className="btn">
          ← Voltar
        </Link>
      </div>

      <h1 className="h2">Telas (Troca de Tela)</h1>
      <p className="sub">Cadastrar opções de tela por modelo + preço padrão (admin)</p>

      <AdminScreenOptionsClient />
    </main>
  );
}
