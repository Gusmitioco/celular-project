/**
 * The project historically used NEXT_PUBLIC_API_URL like "http://localhost:3001/api".
 * Newer code sometimes expects the host without the "/api" suffix.
 *
 * To avoid double "/api/api" bugs, we normalize here:
 * - remove trailing slashes
 * - remove a trailing "/api" (with optional slashes)
 */
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// In dev it's common to start Next with -H 0.0.0.0, and some people copy that URL.
// Browsers/phones can't reliably call 0.0.0.0 as a host, so we auto-fix it.
function fixDevHost(input: string) {
  try {
    const url = new URL(input);

    const canUseWindow = typeof window !== "undefined" && !!window.location?.hostname;
    const pageHost = canUseWindow ? window.location.hostname : "";

    // When you open the frontend on a phone via LAN IP (e.g. 192.168.x.x),
    // any API base that points to localhost/127.0.0.1/0.0.0.0 will break
    // because "localhost" on the phone is the phone itself.
    //
    // So: if the page host is a LAN/real host, force the API host to match it.
    const isPageRemoteHost =
      !!pageHost && pageHost !== "localhost" && pageHost !== "127.0.0.1" && pageHost !== "0.0.0.0";

    const isLocalApiHost =
      url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "0.0.0.0";

    if (canUseWindow && isPageRemoteHost && isLocalApiHost) {
      url.hostname = pageHost;
      return url.toString();
    }
  } catch {
    // ignore
  }
  return input;
}

function normalizeBaseUrl(input: string) {
  const noTrail = input.replace(/\/+$/, "");
  // remove trailing "/api" (optionally wrapped with slashes)
  return noTrail.replace(/\/?api$/i, "");
}

// Exported so other modules (e.g. admin/store login screens) can reliably build URLs
// regardless of whether NEXT_PUBLIC_API_URL includes a trailing "/api".
export const apiBaseUrl = normalizeBaseUrl(fixDevHost(rawBaseUrl));

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    },
    cache: "no-store"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    const err: any = new Error(`HTTP ${res.status} - ${text || res.statusText}`);
    err.status = res.status;
    err.bodyText = text;
    err.bodyJson = parsed;
    throw err;
  }

  return res.json() as Promise<T>;
}

export type Brand = { id: string; name: string; slug: string };
export type Model = { id: string; name: string; brandId: string };
export type Service = { id: string; name: string; priceCents: number };
export type Store = { id: string; name: string; address: string; city: string };

export type OrderItem = {
  id: string;
  serviceId: string;
  priceCents: number;
  service?: Service;
};

export type Order = {
  id: string;
  customerName: string;
  customerWhatsapp: string;
  city: string;
  brandId: string;
  modelId: string;
  totalCents: number;
  createdAt: string;
  items: OrderItem[];
};

// Single-city MVP defaults (public flow)
const DEFAULT_CITY_NAME = process.env.NEXT_PUBLIC_CITY_NAME || "Teixeira de Freitas";
const DEFAULT_CITY_SLUG = process.env.NEXT_PUBLIC_CITY_SLUG || "teixeira-de-freitas";

function slugifyLocal(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const api = {
  // Public list for customer flow.
  // Use this when you need a stable, backend-provided slug (brandSlug).
  listPublicBrands: async () => {
    const q = `?citySlug=${encodeURIComponent(DEFAULT_CITY_SLUG)}`;
    const raw = await http<Array<{ brand: string; slug: string }>>(`/api/brands${q}`);
    return raw.map((b) => ({ id: b.slug, name: b.brand, slug: b.slug }));
  },

  // ===== Public app flow (single-city MVP) =====
  // Backend routes:
  //   GET  /api/brands
  //   GET  /api/models?brandSlug=...
  //   GET  /api/services?modelId=...
  //   POST /api/requests/public
  //   GET  /api/requests/public/:code

  listBrands: async () => {
    // Prefer admin brand IDs when available (admin UI needs numeric IDs).
    // If not authenticated as admin, fall back to public list (slug IDs) for the customer flow.
    try {
      const meta = await http<{ ok: boolean; brands: Array<{ id: number; name: string }> }>(
        `/api/admin/store-models/meta`
      );
      return meta.brands.map((b) => ({ id: String(b.id), name: b.name, slug: slugifyLocal(b.name) }));
    } catch {
      return await api.listPublicBrands();
    }
  },

  listModels: async (brandId?: string) => {
    // Public flow: needs brandSlug.
    if (brandId) {
      const q = `?brandSlug=${encodeURIComponent(brandId)}`;
      const raw = await http<Array<{ id: number; model: string }>>(`/api/models${q}`);
      return raw.map((m) => ({ id: String(m.id), name: m.model, brandId }));
    }

    // Admin flow: list all models with brand info.
    const out = await http<{ ok: boolean; brands: Array<{ id: number; name: string }>; models: any[] }>(
      `/api/admin/models`
    );

    const brandsById = new Map(out.brands.map((b) => [String(b.id), b] as const));
    return (out.models ?? []).map((m: any) => {
      const bid = String(m.brand_id ?? m.brandId ?? "");
      const b = brandsById.get(bid);
      return {
        id: String(m.id),
        name: String(m.name ?? m.model ?? ""),
        brandId: bid,
        brand: b ? { id: String(b.id), name: b.name, slug: slugifyLocal(b.name) } : undefined,
      } as any;
    });
  },

  // Admin services (name-only in backend; price is handled elsewhere)
  listServices: async () => {
    const out = await http<{ ok: boolean; services: Array<{ id: number; name: string }> }>("/api/admin/services");
    return out.services.map((s) => ({ id: String(s.id), name: s.name, priceCents: 0 }));
  },

  createService: async (data: { name: string; priceCents?: number }) => {
    const out = await http<{ ok: boolean; id: number }>("/api/admin/services", {
      method: "POST",
      body: JSON.stringify({ name: data.name }),
    });
    return out;
  },

  updateService: async (id: string, data: { name: string; priceCents?: number }) => {
    const out = await http<{ ok: boolean }>(`/api/admin/services/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ name: data.name }),
    });
    return out;
  },

  deleteService: async (id: string) => {
    const out = await http<{ ok: boolean }>(`/api/admin/services/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return out;
  },

  // Admin models
  createModel: async (data: { name: string; brandId: string }) => {
    const out = await http<{ ok: boolean; id: number }>("/api/admin/models", {
      method: "POST",
      body: JSON.stringify({ name: data.name, brandId: Number(data.brandId) }),
    });
    return out;
  },

  updateModel: async (id: string, data: { name: string; brandId: string }) => {
    const out = await http<{ ok: boolean }>(`/api/admin/models/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ name: data.name, brandId: Number(data.brandId) }),
    });
    return out;
  },

  deleteModel: async (id: string) => {
    const out = await http<{ ok: boolean }>(`/api/admin/models/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return out;
  },

  // Admin stores (single-city MVP sends default city)
  listStores: async () => {
    const out = await http<{ ok: boolean; stores: Array<{ id: number; name: string; city: string; address: string }> }>(
      "/api/admin/stores"
    );
    return out.stores.map((s) => ({ id: String(s.id), name: s.name, city: s.city, address: s.address }));
  },

  createStore: async (data: { name: string; address: string; city?: string }) => {
    const out = await http<{ ok: boolean; id: number }>("/api/admin/stores", {
      method: "POST",
      body: JSON.stringify({ name: data.name, address: data.address, city: data.city ?? DEFAULT_CITY_NAME }),
    });
    return out;
  },

  updateStore: async (id: string, data: { name: string; address: string; city?: string }) => {
    const out = await http<{ ok: boolean }>(`/api/admin/stores/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify({ name: data.name, address: data.address, city: data.city ?? DEFAULT_CITY_NAME }),
    });
    return out;
  },

  deleteStore: async (id: string) => {
    const out = await http<{ ok: boolean }>(`/api/admin/stores/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    return out;
  },

  // Admin store-models mapping
  getStoreModels: async (storeId: string) => {
    const q = `?storeId=${encodeURIComponent(storeId)}`;
    const out = await http<{ ok: boolean; modelIds: number[] }>(`/api/admin/store-models${q}`);
    return out.modelIds.map((id) => String(id));
  },

  setStoreModels: async (storeId: string, modelIds: string[]) => {
    const out = await http<{ ok: boolean }>(`/api/admin/store-models/set`, {
      method: "POST",
      body: JSON.stringify({ storeId: Number(storeId), modelIds: modelIds.map((x) => Number(x)) }),
    });
    return out;
  },

  // Brand CRUD is not implemented in the current backend.
  // We keep these methods so admin UI doesn't crash, but they will show a clear error.
  createBrand: async () => {
    throw new Error("CRUD de marcas ainda não existe no backend (não há rota /api/admin/brands).");
  },
  updateBrand: async () => {
    throw new Error("CRUD de marcas ainda não existe no backend (não há rota /api/admin/brands).");
  },
  deleteBrand: async () => {
    throw new Error("CRUD de marcas ainda não existe no backend (não há rota /api/admin/brands).");
  },

  // Model↔services direct linking is not an explicit concept in this backend.
  // Services availability depends on store prices (store_model_service_prices).
  setModelServices: async () => {
    throw new Error(
      "Vínculo direto Modelo↔Serviços não é configurado por rota separada; isso vem de preços por loja (admin preços / store prices)."
    );
  },

  getModelServices: async (modelId: string) => {
    const q = `?modelId=${encodeURIComponent(modelId)}`;
    const raw = await http<
      Array<{ id: number; service: string; minPriceCents: number; maxPriceCents: number; currency: string }>
    >(`/api/services${q}`);
    return raw.map((s) => ({ id: String(s.id), name: s.service, priceCents: Number(s.minPriceCents) }));
  },

  getScreenOptionsPublic: async (modelId: string, citySlug?: string) => {
    const q = new URLSearchParams();
    q.set("modelId", modelId);
    if (citySlug) q.set("citySlug", citySlug);

    const raw = await http<{
      ok: boolean;
      rows?: Array<{ id: number; label: string; minPriceCents: number; maxPriceCents: number; currency: string; storeCount: number }>;
      error?: string;
    }>(`/api/screen-options/public?${q.toString()}`);

    if (!raw?.ok) return [];
    const rows = Array.isArray(raw.rows) ? raw.rows : [];

    return rows.map((o) => ({
      id: String(o.id),
      label: o.label,
      minPriceCents: Number(o.minPriceCents),
      maxPriceCents: Number(o.maxPriceCents),
      currency: o.currency ?? "BRL",
      storeCount: Number(o.storeCount ?? 0),
    }));
  },

  createOrder: async (data: {
    // legacy fields from the styled UI (kept for compatibility)
    customerName?: string;
    customerWhatsapp?: string;
    brandId?: string;
    // required
    modelId: string;
    serviceIds: string[];
    // optional: for future multi-city/multi-store
    citySlug?: string;
    storeId?: string;
    screenOptionId?: string;
  }) => {
    const payload = {
      modelId: Number(data.modelId),
      serviceIds: data.serviceIds.map((x) => Number(x)),
      citySlug: data.citySlug,
      storeId: data.storeId ? Number(data.storeId) : undefined,
      screenOptionId: data.screenOptionId ? Number(data.screenOptionId) : undefined,
    };

    const out = await http<{
      ok: boolean;
      requestId: number;
      code: string;
      totalCents: number;
      currency: string;
      store: { name: string; address: string; city: string } | null;
    }>("/api/requests/public", { method: "POST", body: JSON.stringify(payload) });

    return {
      id: out.code,
      customerName: "",
      customerWhatsapp: "",
      city: out.store?.city ?? "",
      brandId: "",
      modelId: data.modelId,
      totalCents: out.totalCents,
      createdAt: new Date().toISOString(),
      items: [],
    } as Order;
  },

  getScreenOptionsPublic: async (modelId: string, citySlug?: string) => {
    const q = `?modelId=${encodeURIComponent(modelId)}${citySlug ? `&citySlug=${encodeURIComponent(citySlug)}` : ""}`;
    const raw = await http<
      Array<{ id: number; label: string; minPriceCents: number; maxPriceCents: number; storeCount: number; currency: string }>
    >(`/api/screen-options/public${q}`);
    return raw;
  },

  getOrder: async (code: string) => {
    const out = await http<{ ok: boolean; request: any }>(`/api/requests/public/${encodeURIComponent(code)}`);
    const r = out.request;
    return {
      id: r.code,
      customerName: "",
      customerWhatsapp: "",
      city: r.store_city ?? "",
      brandId: "",
      modelId: String(r.model_id ?? ""),
      totalCents: Number(r.total_cents ?? 0),
      createdAt: r.created_at,
      items: [],
      status: r.status,
      // extra fields for UI convenience
      storeName: r.store_name,
      storeAddress: r.store_address,
      modelName: r.model_name,
    } as any;
  },

  // Customer request detail (header + items)
  getMyRequest: async (code: string) => {
    const out = await http<{ ok: boolean; header: any; items: any[] }>(`/api/requests/me/${encodeURIComponent(code)}`);
    return out;
  },

  // Customer: cancel/delete a request completely.
  // The backend only allows deletion while status='created'.
  deleteMyRequest: async (code: string) => {
    const out = await http<{ ok: boolean }>(`/api/requests/me/${encodeURIComponent(code)}`, {
      method: "DELETE",
    });
    return out.ok;
  },

  // Customer chat
  listMyRequestMessages: async (code: string) => {
    const out = await http<{ ok: boolean; rows: any[] }>(
      `/api/requests/me/${encodeURIComponent(code)}/messages`
    );
    return out.rows;
  },

  sendMyRequestMessage: async (code: string, message: string) => {
    const out = await http<{ ok: boolean; id?: number }>(
      `/api/requests/me/${encodeURIComponent(code)}/messages`,
      { method: "POST", body: JSON.stringify({ message }) }
    );
    return out.ok;
  },

  // Customer area
  listMyRequests: async () => {
    const out = await http<{ ok: boolean; rows: any[] }>(`/api/requests/me`);
    return out.rows as any[];
  },

  getMe: async () => {
    const out = await http<{ ok: boolean; user: any }>(`/api/auth/me`);
    return out.user;
  },

  updateMe: async (data: { name?: string; phone?: string }) => {
    const out = await http<{ ok: boolean; user: any }>(`/api/auth/me`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return out.user;
  },

  updatePassword: async (data: {
    currentPassword: string;
    newPassword: string;
    newPasswordConfirm: string;
  }) => {
    const out = await http<{ ok: boolean }>(`/api/auth/password`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    return out.ok;
  },

  login: async (data: { email: string; password: string }) => {
    const out = await http<{ ok: boolean }>(`/api/auth/login`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return out.ok;
  },

  register: async (data: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    passwordConfirm: string;
  }) => {
    const out = await http<{ ok: boolean }>(`/api/auth/register`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return out.ok;
  },

  logout: async () => {
    const out = await http<{ ok: boolean }>(`/api/auth/logout`, { method: "POST" });
    return out.ok;
  },

  // ===== Admin endpoints (kept for later) =====
  // NOTE: The styled frontend currently ships admin pages, but the MVP user flow does not require them.
};
