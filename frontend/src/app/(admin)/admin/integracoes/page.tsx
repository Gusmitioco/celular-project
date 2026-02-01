import { AdminIntegracoesClient } from "./ui";

export default function AdminIntegracoesPage() {
  return (
    <main className="adminContainer">
      <h1 className="h2">Integrações</h1>
      <p className="sub">Configurar webhook por loja</p>
      <AdminIntegracoesClient />
    </main>
  );
}
