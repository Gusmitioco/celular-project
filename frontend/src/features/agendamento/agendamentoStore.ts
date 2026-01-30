import type { Brand, Model, Service } from "@/types/api";

export type AgendamentoState = {
  brand: Brand | null;
  model: Model | null;
  services: Service[];
};

const KEY = "consertfacil_agendamento_v1";

export function loadAgendamento(): AgendamentoState {
  if (typeof window === "undefined") return { brand: null, model: null, services: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { brand: null, model: null, services: [] };
    return JSON.parse(raw) as AgendamentoState;
  } catch {
    return { brand: null, model: null, services: [] };
  }
}

export function saveAgendamento(state: AgendamentoState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function clearAgendamento() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
