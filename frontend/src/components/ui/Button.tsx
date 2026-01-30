"use client";

import React from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "danger" | "back" | "confirm";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({ variant = "primary", className, children, ...props }: Props) {
  const base =
    "relative inline-flex items-center justify-center overflow-hidden rounded-2xl px-6 py-3 text-sm font-semibold transition " +
    "ring-1 ring-black/10 shadow-sm " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-dracula-accent/60 focus-visible:ring-offset-0 " +
    "disabled:opacity-60 disabled:cursor-not-allowed";

  const variants: Record<Variant, string> = {
    primary:
      "bg-dracula-accent text-dracula-bg shadow-[0_18px_45px_-20px_rgba(80,250,123,0.9)] hover:brightness-95 active:translate-y-[1px]",
    secondary: "bg-white/[0.14] text-dracula-text ring-white/[0.20]  glass-fix hover:bg-white/[0.18]",
    danger: "bg-dracula-accent2 text-dracula-bg hover:brightness-95 active:translate-y-[1px]",
    // Botão de voltar segue o destaque do CTA (verde); refinamentos visuais ficam no BackButton.
    back:
      "bg-dracula-accent text-dracula-bg shadow-[0_18px_45px_-20px_rgba(80,250,123,0.9)] hover:brightness-110 hover:shadow-[0_22px_60px_-22px_rgba(80,250,123,1)] active:translate-y-[1px]",
    // Botão de confirmação (ex.: serviços) com cor diferente e sensação de finalização.
    confirm:
      "bg-gradient-to-r from-[#8b5cf6] via-[#a855f7] to-[#ec4899] text-white shadow-[0_18px_55px_-25px_rgba(168,85,247,0.95)] hover:brightness-110 hover:shadow-[0_26px_75px_-28px_rgba(236,72,153,0.95)] active:translate-y-[1px]",
  };

  return (
    <button className={clsx(base, variants[variant], className)} {...props}>
      <span className="relative z-[2]">{children}</span>
    </button>
  );
}
