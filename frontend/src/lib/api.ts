import { apiBaseUrl } from "@/services/api";

// Helper used by a few legacy components.
// Builds URLs against the backend router mounted under /api.
function withApiPrefix(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.startsWith("/api/") || p === "/api" ? p : `/api${p}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${apiBaseUrl}${withApiPrefix(path)}`;
  try {
    const res = await fetch(url, { cache: "no-store", credentials: "include" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} for ${url}\n${text}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    throw new Error(`Fetch failed for ${url}\n${err?.message ?? String(err)}`);
  }
}
