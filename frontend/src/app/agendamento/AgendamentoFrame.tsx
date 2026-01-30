"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { StepsNav } from "@/components/layout/StepsNav";
import { ClientShell } from "@/components/layout/ClientShell";

function currentFromPath(pathname: string) {
  if (pathname.includes("/agendamento/marca")) return 0;
  if (pathname.includes("/agendamento/modelo")) return 1;
  if (pathname.includes("/agendamento/servicos")) return 2;
  if (pathname.includes("/agendamento/checkout")) return 3;
  return 0;
}

export function AgendamentoFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const current = currentFromPath(pathname);

  return (
    <ClientShell>
      <StepsNav current={current} />
      <div className="mt-6">{children}</div>
    </ClientShell>
  );
}
