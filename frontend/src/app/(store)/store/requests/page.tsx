import { StoreRequestsClient } from "./ui";

export default function StoreRequestsPage() {
  return (
    <main className="adminContainer">
      <h1 className="h2">Validar código</h1>
      <p className="sub">Digite o código do cliente para ver os detalhes</p>
      <StoreRequestsClient />
    </main>
  );
}
