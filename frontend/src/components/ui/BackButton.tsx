"use client";

import React from "react";
import clsx from "clsx";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Texto padrão (some no hover). */
  label?: string;
};

export function BackButton({ className, label = "Voltar", type, onPointerDown, ...props }: Props) {
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
        // wrapper cria a “borda” (verde)
        "group relative inline-flex min-w-[150px] items-center justify-center p-[2px] overflow-hidden rounded-2xl text-sm font-semibold transition",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-dracula-accent/40",
        "bg-dracula-accent",
        // elevated
        "shadow-[0_10px_26px_-18px_rgba(0,0,0,0.78),0_18px_55px_-30px_rgba(80,250,123,0.35)]",
        "hover:shadow-[0_16px_38px_-20px_rgba(0,0,0,0.70),0_0_46px_-18px_rgba(80,250,123,0.95)]",
        "hover:-translate-y-[1px] active:translate-y-[0px]",
        // flash no clique
        flash && "flash-shadow",
        className,
      )}
      style={{
        // @ts-expect-error CSS var
        "--flash": "rgba(80, 250, 123, 0.95)",
      }}
      aria-label={label}
      {...props}
    >
      <span
        className={clsx(
          "relative inline-flex w-full items-center justify-center rounded-[14px] px-5 py-3 transition-all duration-200 ease-out",
          // estado padrão: deixa a borda em destaque (glass bem leve)
          "bg-dracula-card/20  glass-fix-md text-white/90 ring-1 ring-white/10",
          // hover: deixa o miolo transparente => verde preenche tudo
          "group-hover:bg-transparent group-hover:ring-transparent group-hover:text-white",
          "disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {/* Texto some no hover */}
        <span className="transition-all duration-200 group-hover:opacity-0 group-hover:-translate-x-1">{label}</span>

        {/* Seta aparece no hover (maior e centralizada) */}
        <span
          className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-200 group-hover:opacity-100 text-[36px] leading-none"
          aria-hidden="true"
        >
          <span className="hidden md:inline">🠔</span>
          <span className="md:hidden">←</span>
        </span>
      </span>
    </button>
  );
}
