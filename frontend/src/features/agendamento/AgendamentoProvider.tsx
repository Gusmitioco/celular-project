"use client";

import React from "react";
import type { Brand, Model, Service } from "@/types/api";
import { loadAgendamento, saveAgendamento, clearAgendamento, AgendamentoState } from "./agendamentoStore";

type Ctx = AgendamentoState & {
  hydrated: boolean;
  setBrand: (b: Brand) => void;
  setModel: (m: Model) => void;
  toggleService: (s: Service) => void;
  reset: () => void;
  totalCents: number;
};

const AgendamentoContext = React.createContext<Ctx | null>(null);

export function AgendamentoProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = React.useState(false);
  const [state, setState] = React.useState<AgendamentoState>({ brand: null, model: null, services: [] });

  React.useEffect(() => {
    setState(loadAgendamento());
    setHydrated(true);
  }, []);

  // Persist synchronously in the setters so we don't lose progress when the user
  // navigates away quickly (e.g. clicks "Login" right after selecting services).
  const updateAndPersist = React.useCallback((updater: (prev: AgendamentoState) => AgendamentoState) => {
    setState((prev) => {
      const next = updater(prev);
      try {
        saveAgendamento(next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const setBrand = (b: Brand) => updateAndPersist(() => ({ brand: b, model: null, services: [] }));
  const setModel = (m: Model) => updateAndPersist((prev) => ({ ...prev, model: m, services: [] }));
  const toggleService = (s: Service) =>
    updateAndPersist((prev) => {
      const exists = prev.services.some((x) => x.id === s.id);
      return {
        ...prev,
        services: exists ? prev.services.filter((x) => x.id !== s.id) : [...prev.services, s],
      };
    });

  const reset = () => {
    clearAgendamento();
    setState({ brand: null, model: null, services: [] });
  };

  const totalCents = state.services.reduce((acc, s) => acc + s.priceCents, 0);

  return (
    <AgendamentoContext.Provider value={{ ...state, hydrated, setBrand, setModel, toggleService, reset, totalCents }}>
      {children}
    </AgendamentoContext.Provider>
  );
}

export function useAgendamento() {
  const ctx = React.useContext(AgendamentoContext);
  if (!ctx) throw new Error("useAgendamento deve ser usado dentro de AgendamentoProvider");
  return ctx;
}
