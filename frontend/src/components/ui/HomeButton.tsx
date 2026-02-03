// components/ui/HomeButton.tsx
import Link from "next/link";
import React from "react";

type HomeButtonProps = {
  href?: string;
  className?: string;
};

/**
 * Botão compacto (mesmo tamanho do Voltar) que vira ícone no hover.
 */
export default function HomeButton({ href = "/", className = "" }: HomeButtonProps) {
  return (
    <Link
      href={href}
      draggable={false}
      className={
        "group inline-flex h-12 w-44 select-none items-center justify-center rounded-full " +
        "border border-white/15 bg-white/[0.06] px-4 text-[15px] font-semibold text-white/90 " +
        "shadow-[0_0_0_1px_rgba(255,255,255,0.06)] backdrop-blur-sm " +
        "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/25 " +
        "hover:bg-white/[0.10] hover:text-white hover:shadow-[0_0_22px_rgba(255,255,255,0.10)] " +
        "active:translate-y-0 " +
        className
      }
      aria-label="Ir para o início"
      title="Início"
    >
      <span className="relative inline-flex items-center justify-center">
        <span className="transition-all duration-300 ease-out group-hover:scale-95 group-hover:opacity-0">
          Inicio
        </span>
        <span
          className={
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 " +
            "text-2xl leading-none opacity-0 scale-90 transition-all duration-300 ease-out " +
            "group-hover:opacity-100 group-hover:scale-100"
          }
          aria-hidden
        >
          ⌂
        </span>
      </span>
    </Link>
  );
}
