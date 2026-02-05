"use client";

// components/ui/HomeButton.tsx
import Link from "next/link";
import React from "react";
import clsx from "clsx";

type HomeButtonProps = {
  href?: string;
  className?: string;
};

/**
 * Botão (mesmo tamanho do Voltar) com estilo “ghost premium”.
 * - Retangular (rounded-2xl)
 * - Miolo cinza (não totalmente transparente)
 * - Borda + efeitos em branco
 * - No hover, o texto some e aparece o ⌂ levemente alinhado para cima
 * - No clique, aplica um "glow" branco (mesma cor do botão)
 */
export default function HomeButton({ href = "/", className = "" }: HomeButtonProps) {
  const preventDrag: React.DragEventHandler<HTMLAnchorElement> = (e) => e.preventDefault();

  return (
    <Link
      href={href}
      draggable={false}
      onDragStart={preventDrag}
      className={clsx(
        "group relative inline-flex min-w-[150px] items-center justify-center overflow-hidden rounded-2xl p-[2px] text-sm font-semibold transition",
        "select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35",
        // “borda” branca sutil
        "bg-white/15",
        // elevated + glow branco
        "shadow-[0_10px_26px_-18px_rgba(0,0,0,0.78),0_18px_55px_-30px_rgba(255,255,255,0.10)]",
        "hover:shadow-[0_16px_38px_-20px_rgba(0,0,0,0.70),0_0_46px_-18px_rgba(255,255,255,0.40)]",
        "hover:-translate-y-[1px]",
        // Luz no clique (branco)
        "active:translate-y-[0px] active:shadow-[0_14px_34px_-20px_rgba(0,0,0,0.70),0_0_0_6px_rgba(255,255,255,0.16),0_0_30px_rgba(255,255,255,0.22)]",
        className,
      )}
      aria-label="Ir para o início"
      title="Início"
    >
      <span
        className={clsx(
          "relative inline-flex w-full items-center justify-center rounded-[14px] px-5 py-3 transition-all duration-200 ease-out",
          // miolo cinza (não transparente)
          "bg-white/[0.10] text-white/90 ring-1 ring-white/15",
          "group-hover:bg-white/[0.10] group-hover:ring-white/25 group-hover:text-white",
          // reforça o brilho no clique
          "group-active:bg-white/[0.16] group-active:ring-white/35",
        )}
      >
        <span className="transition-all duration-200 group-hover:opacity-0 group-hover:-translate-x-1">
          Início
        </span>

        <span
          className="absolute inset-0 flex items-center justify-center text-[30px] leading-none opacity-0 transition-all duration-200 group-hover:opacity-100"
          aria-hidden="true"
          style={{ transform: "translateY(-1px)" }}
        >
          ⌂
        </span>
      </span>
    </Link>
  );
}
