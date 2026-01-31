import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { StoreDashboardClient } from "./ui";

export default async function StoreHomePage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/store-auth/me`, {
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
          <Link className="btn" href="/store/inbox">
            Inbox
          </Link>

          <Link className="btn" href="/store/requests">
            Buscar por código
          </Link>

          <Link className="btn" href="/store/prices">
            Preços
          </Link>
        </div>
      </div>

      <h1 className="h2">Atendimentos</h1>
      <p className="sub">
        Para iniciar um atendimento, busque pelo código do cliente. Aqui você acompanha apenas os
        atendimentos em andamento e concluídos.
      </p>

      <StoreDashboardClient />
    </main>
  );
}
