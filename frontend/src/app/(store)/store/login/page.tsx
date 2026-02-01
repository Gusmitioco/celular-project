import { StoreLoginClient } from "./ui";

export default function StoreLoginPage() {
  return (
    <main className="grid" style={{ gap: 12 }}>
      <h1 className="h2">Login da Loja</h1>
      <p className="sub">Acesse para validar códigos e finalizar serviços</p>
      <StoreLoginClient />
    </main>
  );
}
