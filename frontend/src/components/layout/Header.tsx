"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { rotas } from "@/lib/rotas";
import { useAuth } from "@/components/auth/AuthProvider";

export function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // A Home tem topbar própria. Para não duplicar, ocultamos nela.
  if (pathname === "/") return null;

  // Áreas internas não usam o header público.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/store")) return null;

  return (
    <header
      className={
        "sticky top-0 z-20 relative border-b border-white/[0.12] glass-fix " +
        "bg-gradient-to-b from-[#2a1450]/70 via-[#1a0d32]/55 to-[#120a1f]/40  " +
        // efeito de “elevated” (parece acima do resto da página)
        "shadow-[0_14px_48px_rgba(0,0,0,0.45)]"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <Link href={rotas.home()} className="flex items-center gap-2 no-drag" draggable={false}>
          <Image
            src="/logo-conserte-facil.png"
            alt="ConSERTE FÁCIL"
            width={32}
            height={32}
            className="logo-glow opacity-95 no-drag"
            draggable={false}
            priority
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-dracula-text">ConSERTE FÁCIL</p>
            <p className="text-[11px] text-dracula-text/65">Assistência técnica</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/meus-pedidos"
            className="rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20]  glass-fix transition hover:bg-white/[0.18]"
          >
            Meus Pedidos
          </Link>
          {user ? (
            <Link
              href="/conta"
              className="text-sm font-semibold text-dracula-text/90 transition hover:text-dracula-accent"
              title={user.email ?? ""}
            >
              {user.name?.trim() ? user.name : "Minha conta"}
            </Link>
          ) : (
            <Link
              href={`/login?returnTo=${encodeURIComponent(
                `${pathname || "/"}${searchParams?.toString() ? `?${searchParams.toString()}` : ""}`
              )}`}
              className="rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20] glass-fix transition hover:bg-white/[0.18]"
              aria-label="Login"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
