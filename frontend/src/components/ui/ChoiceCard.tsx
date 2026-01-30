"use client";

import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  selected?: boolean;
  /** Efeito de confirmação ao clicar (opcional) */
  flash?: boolean;
  className?: string;

  /** Ajustes opcionais */
  fullWidth?: boolean; // default true
  centerContent?: boolean; // default true
  hoverLift?: "sm" | "md" | "lg" | "none"; // default "sm"
};

function liftToClass(hoverLift: Props["hoverLift"]) {
  switch (hoverLift) {
    case "none":
      return "";
    case "sm":
      // Sutil: evita clipping no topo do container com overflow
      return "hover:-translate-y-0.5";
    case "md":
      return "hover:-translate-y-2";
    case "lg":
      return "hover:-translate-y-[10px]";
    default:
      return "hover:-translate-y-1";
  }
}

export function ChoiceCard({
  title,
  subtitle,
  onClick,
  selected = false,
  flash = false,
  className = "",
  fullWidth = true,
  centerContent = true,
  hoverLift = "sm",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        fullWidth ? "w-full" : "",
        "text-left rounded-2xl p-5 transition-all duration-150",
        // ring-inset evita que a borda (principalmente a verde de selecionado) seja cortada pelo container com overflow.
        "ring-inset  glass-fix",
        "shadow-md hover:shadow-xl",
        liftToClass(hoverLift),
        // feedback visual no clique: pisca SOMENTE a borda (sem alterar o centro)
        flash ? "choice-border-flash" : "",
        selected
          ? "bg-dracula-card/45 ring-[2.5px] ring-dracula-accent/80 shadow-[0_18px_45px_-30px_rgba(80,250,123,0.9)]"
          : "bg-dracula-card/34 ring-1 ring-white/10 hover:bg-dracula-card/44 hover:ring-white/[0.18]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={["flex items-start justify-between gap-4", centerContent ? "text-center" : ""].filter(Boolean).join(" ")}>
        <div className={centerContent ? "w-full" : ""}>
          <div className="text-base font-semibold text-dracula-text">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-dracula-text/70">{subtitle}</div> : null}
        </div>

        <span
          className={[
            "mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full ring-1",
            selected ? "bg-dracula-accent text-dracula-bg ring-black/10" : "bg-white/5 text-white/50 ring-white/[0.18]",
            centerContent ? "hidden" : "",
          ].join(" ")}
          aria-hidden="true"
        >
          {selected ? "✓" : " "}
        </span>
      </div>
    </button>
  );
}
