import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StoreInboxClient } from "./ui";
import { apiBaseUrl } from "@/services/api";

export default async function StoreInboxPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${apiBaseUrl}/api/store-auth/me`, {
    headers: cookieHeader ? { Cookie: cookieHeader } : {},
    cache: "no-store",
  }).catch(() => null);

  if (!res || !res.ok) redirect("/store/login");

  const data = await res.json().catch(() => null);
  const user = data?.user;

  return (
    <main className="grid" style={{ gap: 12 }}>
      <div className="btnRow" style={{ justifyContent: "space-between" }}>
        <div className="cardMeta">
          Logado como <b>{user?.username}</b> — <b>{user?.storeName}</b> ({user?.storeCity})
        </div>

        <div className="btnRow">
          <Link className="btn" href="/store">
            ← Voltar
          </Link>
          <Link className="btn" href="/store/requests">
            Buscar por código
          </Link>
        </div>
      </div>

      <h1 className="h2">Inbox</h1>
      <p className="sub">Conversas disponíveis (atendimentos em andamento, concluídos ou cancelados)</p>

      <StoreInboxClient />
    </main>
  );
}
