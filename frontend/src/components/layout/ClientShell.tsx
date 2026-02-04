import React from "react";

type Props = {
  title?: string;
  children: React.ReactNode;
  header?: React.ReactNode; // título/subtítulo do step
  steps?: React.ReactNode; // StepsNav
  footer?: React.ReactNode; // botões (Voltar/Confirmar)
  footerContainerClassName?: string; // classe do container do footer
  maxWidthClassName?: string; // ex: "max-w-5xl"
};

export function ClientShell({ title, header, steps, children, footer, footerContainerClassName, maxWidthClassName = "max-w-5xl" }: Props) {
  const resolvedHeader =
    header ??
    (title ? (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-dracula-text sm:text-3xl">{title}</h1>
      </div>
    ) : null);

  return (
    // We avoid vertically centering pages inside the main layout. Vertical centering can
    // create large empty gaps before the footer and also makes the sticky header overlap
    // the first card content on some screens.
    <div className="mx-auto flex w-full items-start justify-center px-4 py-8 sm:px-6 sm:py-10">
      <div
        className={[
          "relative",
          "w-full",
          maxWidthClassName,
          "rounded-3xl overflow-visible",
        ].join(" ")}
      >
        {/* camada visual do card (clipada no radius), mantendo o conteúdo livre para sombras/efeitos */}
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute inset-0 rounded-3xl",
            "bg-white/[0.14]  glass-fix",
            // Evita artefatos/hairlines do Chrome com border + 
            "ring-1 ring-white/[0.14] ring-inset",
            "shadow-[0_20px_70px_-45px_rgba(0,0,0,0.8)]",
            "overflow-hidden",
          ].join(" ")}
        />

        <div className="relative">
        {/* topo do card */}
        {steps || resolvedHeader ? (
          <div className="px-4 pt-6 sm:px-6 sm:pt-7 lg:px-10 lg:pt-8">
            {steps ? <div className="flex justify-center">{steps}</div> : null}
            {resolvedHeader ? <div className="mt-6">{resolvedHeader}</div> : null}
          </div>
        ) : null}

        {/* conteúdo (evite overflow aqui para não cortar sombras/glows dos botões) */}
        <div className="px-4 py-7 sm:px-6 sm:py-8 lg:px-10">
          {children}
        </div>

        {/* barra de ações fixa no final do card */}
        {footer ? (
          <div className={footerContainerClassName ?? "px-4 py-5 sm:px-6 sm:py-6 lg:px-10 ring-1 ring-white/[0.14] ring-inset bg-gradient-to-r from-white/[0.06] via-white/[0.03] to-white/[0.06] overflow-visible"}>
            {footer}
          </div>
        ) : null}
        </div>
      </div>
    </div>
  );
}
