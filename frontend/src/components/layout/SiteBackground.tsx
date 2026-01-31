"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";

/**
 * Fundo padrão do site (imagem + camadas roxas + glows), inspirado na Home.
 * Use como wrapper para manter consistência visual em todas as páginas.
 */
export function SiteBackground({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  // Áreas internas (admin/store) usam seus próprios layouts/CSS.
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/store")) {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-dracula-page text-dracula-text">
      {/* Camadas de fundo */}
      <div className="pointer-events-none absolute inset-0">
        {/*
          Opção 1 (estável): blur SOMENTE no background.
          Usamos `filter: blur()` em uma camada dedicada (sem backdrop-filter),
          então não dispara o bug de hairline do Chrome ao perder foco.
        */}
        <div className="absolute inset-0 transform-gpu scale-[1.04] filter blur-[10px] saturate-125 brightness-110">
          <div className="absolute inset-0">
            {isHome ? (
              <Image
                src="/hero-bg.jpg"
                alt="Bancada de assistência técnica"
                fill
                priority
                className="object-cover object-center opacity-35"
              />
            ) : null}
          </div>

          {/*
            A Home fica naturalmente mais "viva" por causa da foto.
            Para as demais páginas (sem foto), clareamos levemente as camadas
            e adicionamos um highlight central para manter a mesma energia.
          */}
          <div
            className={
              "absolute inset-0 mix-blend-multiply " + (isHome ? "bg-[#3A0F66]/70" : "bg-[#3A0F66]/55")
            }
          />
          <div
            className={
              "absolute inset-0 bg-gradient-to-b " +
              (isHome
                ? "from-dracula-hero2/70 via-dracula-hero2/55 to-dracula-hero2"
                : "from-dracula-hero2/60 via-dracula-hero2/45 to-dracula-hero2")
            }
          />

          {/* glows base */}
          <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-fuchsia-500/22 blur-3xl" />
          <div className="absolute -bottom-48 -right-48 h-[560px] w-[560px] rounded-full bg-violet-400/18 blur-3xl" />

          {/* highlight central (somente fora da Home) */}
          {!isHome ? (
            <>
              <div className="absolute left-1/2 top-[28%] h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-400/10 blur-3xl" />
              <div className="absolute left-1/2 top-[32%] h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-dracula-accent/10 blur-3xl" />
            </>
          ) : null}
        </div>

        {/* grain/noise overlay (sutil) - fica FORA do blur pra manter textura nítida */}
        <div
          className={
            "absolute inset-0 bg-noise " +
            (isHome ? "opacity-[0.05] mix-blend-overlay" : "opacity-[0.06] mix-blend-soft-light")
          }
        />
      </div>

      {/* Conteúdo */}
      <div className="relative min-h-screen">{children}</div>
    </div>
  );
}
