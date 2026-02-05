import Link from "next/link";
import { rotas } from "@/lib/rotas";

export function AdminSidebar() {
  const Item = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      className="block rounded-xl px-3 py-2 text-sm font-semibold text-dracula-text/85 ring-1 ring-transparent transition hover:bg-white/[0.08] hover:ring-white/[0.12]"
    >
      {label}
    </Link>
  );

  return (
    <aside className="w-full md:w-64">
      <div className="rounded-2xl bg-white/[0.08] p-4 ring-1 ring-white/[0.12]  glass-fix">
        <div className="text-xs font-semibold text-dracula-text/70 mb-3">Admin</div>
        <div className="space-y-2">
          <Item href={rotas.admin.dashboard()} label="Dashboard" />
          <Item href={rotas.admin.marcas()} label="Marcas" />
          <Item href={rotas.admin.modelos()} label="Modelos" />
          <Item href={rotas.admin.servicos()} label="Serviços" />
          <Item href={rotas.admin.lojas()} label="Lojas" />
          <Item href={rotas.admin.modelosDaLoja()} label="Modelos da Loja" />
        </div>
      </div>
    </aside>
  );
}
