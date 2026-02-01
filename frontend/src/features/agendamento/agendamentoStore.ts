import type { Brand, Model, Service } from "@/types/api";

export type AgendamentoState = {
  brand: Brand | null;
  model: Model | null;
  services: Service[];
};

const KEY = "consertfacil_agendamento_v1";

function slugifyLocal(input: string) {
  return String(input)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function loadAgendamento(): AgendamentoState {
  if (typeof window === "undefined") return { brand: null, model: null, services: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { brand: null, model: null, services: [] };
    const parsed = JSON.parse(raw) as AgendamentoState;

    // Normalize legacy stored state: older builds sometimes stored brand.id as a numeric string
    // and omitted the slug. The backend expects a slug for `brandSlug`.
    if (parsed?.brand) {
      if (!parsed.brand.slug || parsed.brand.slug === "") {
        parsed.brand.slug = slugifyLocal(parsed.brand.name);
      }
      // If an older build stored a numeric id, prefer the slug for the customer flow.
      if (/^\d+$/.test(String(parsed.brand.id)) && parsed.brand.slug) {
        parsed.brand.id = parsed.brand.slug;
      }
    }

    return parsed;
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
