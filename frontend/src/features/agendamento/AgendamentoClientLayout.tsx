"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ClientShell } from "@/components/layout/ClientShell";
import { StepsNav } from "@/components/layout/StepsNav";

function getCurrentStep(pathname: string): 0 | 1 | 2 | 3 {
  if (pathname.includes("/agendamento/modelo")) return 1;
  if (pathname.includes("/agendamento/servicos")) return 2;
  if (pathname.includes("/agendamento/tela")) return 2;
  if (pathname.includes("/agendamento/checkout")) return 3;
  if (pathname.includes("/agendamento/confirmado")) return 3;
  return 0;
}

export function AgendamentoClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = getCurrentStep(pathname || "");
  const finalized = (pathname || "").includes("/agendamento/confirmado");

  return <ClientShell steps={<StepsNav current={current} finalized={finalized} />}>{children}</ClientShell>;
}
