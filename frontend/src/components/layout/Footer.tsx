"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();

  // Áreas internas não usam o footer público.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/store")) return null;

  return (
    <footer className="relative border-t border-white/10 glass-fix bg-gradient-to-t from-[#2a1450]/55 via-[#1a0d32]/40 to-[#120a1f]/25  shadow-[0_-14px_48px_rgba(0,0,0,0.45)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-dracula-text/70 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} ConSERTE FÁCIL</p>

        <div className="flex gap-4">
          <Link className="transition hover:text-dracula-text" href="/politica-de-privacidade">
            Privacidade
          </Link>
          <Link className="transition hover:text-dracula-text" href="/termos">
            Termos
          </Link>
          <Link className="transition hover:text-dracula-text" href="/contato">
            Contato
          </Link>
        </div>
      </div>
    </footer>
  );
}
