"use client";

import React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

/**
 * Botão de confirmação (Confirmar serviços):
 * - Elevated em repouso
 * - “Glass” por dentro + borda em gradiente
 * - Hover: preenche com o gradiente
 * - Clique: sombra pisca na cor do botão
 */
export function ConfirmButton({ className, label = "Confirmar serviço", type, onPointerDown, ...props }: Props) {
  const [flash, setFlash] = React.useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!props.disabled) {
      setFlash(true);
      window.setTimeout(() => setFlash(false), 240);
    }
    onPointerDown?.(e);
  };

  return (
    <button
      type={type ?? "button"}
      onPointerDown={handlePointerDown}
      className={clsx(
        // wrapper: cria a “borda” do gradiente
        "group relative inline-flex items-center justify-center p-[2px] overflow-hidden rounded-2xl text-sm font-semibold transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8b5cf6]/40",
        // elevated
        "shadow-[0_10px_26px_-18px_rgba(0,0,0,0.78)] hover:shadow-[0_16px_38px_-20px_rgba(0,0,0,0.70),0_0_46px_-18px_rgba(168,85,247,0.85)]",
        "hover:-translate-y-[1px] active:translate-y-[0px]",
        "bg-gradient-to-br from-[#8b5cf6] to-[#ec4899]",
        // flash no clique
        flash && "flash-shadow",
        className,
      )}
      style={{
        // @ts-expect-error CSS var
        "--flash": "rgba(236, 72, 153, 0.95)",
      }}
      {...props}
    >
      <span
        className={clsx(
          "relative inline-flex w-full items-center justify-center rounded-[14px] px-5 py-3 transition-all duration-200 ease-out",
          // estado padrão: “quase transparente”, deixando a borda em destaque (sem parecer botão preenchido)
          "bg-dracula-card/20  glass-fix-md text-white/90 ring-1 ring-white/10",
          // hover: deixa o miolo transparente => gradiente preenche tudo
          "group-hover:bg-transparent group-hover:ring-transparent group-hover:text-white",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {label}
      </span>
    </button>
  );
}
