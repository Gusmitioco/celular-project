import React from "react";
import { AgendamentoProvider } from "@/features/agendamento/AgendamentoProvider";
import { AgendamentoClientLayout } from "@/features/agendamento/AgendamentoClientLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AgendamentoProvider>
      <AgendamentoClientLayout>{children}</AgendamentoClientLayout>
    </AgendamentoProvider>
  );
}
