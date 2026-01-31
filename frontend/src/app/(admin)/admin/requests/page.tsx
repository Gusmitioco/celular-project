import { AdminRequestsClient } from "./ui";

export default function AdminRequestsPage() {
  return (
    <main className="adminContainer">
      <h1 className="h2">Requests</h1>
      <p className="sub">Lista de solicitações (códigos gerados)</p>
      <AdminRequestsClient />
    </main>
  );
}
