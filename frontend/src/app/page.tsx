import { apiGet } from "../lib/api";

// remove later
console.log("API URL =", process.env.NEXT_PUBLIC_API_URL);

type Health = { ok: boolean; service: string };

export default async function HomePage() {
  const health = await apiGet<Health>("/health");

  return (
    <main>
      <h1>TechFix</h1>
      <p>
        Backend status: <strong>{health.ok ? "connected ✅" : "not connected ❌"}</strong>
      </p>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </main>
  );
}
