const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("Missing NEXT_PUBLIC_API_URL (check frontend/.env.local)");
}

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${API_URL}${path}`;
  try {
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`API ${res.status} ${res.statusText} for ${url}\n${text}`);
    }

    return (await res.json()) as T;
  } catch (err: any) {
    throw new Error(`Fetch failed for ${url}\n${err?.message ?? String(err)}`);
  }
}
