"use client";

import { useEffect, useState } from "react";
import { apiBaseUrl } from "@/services/api";

type MeResponse =
  | { ok: true; user: { role: "owner"; username: string } }
  | { ok: false; error: string };

export function AdminMe() {
  const [me, setMe] = useState<MeResponse | null>(null);

  useEffect(() => {
    fetch(`${apiBaseUrl}/api/admin/me`, {
      credentials: "include",
      cache: "no-store",
    })
      .then(async (r) => {
        const data = (await r.json().catch(() => null)) as MeResponse | null;
        setMe(data ?? { ok: false, error: "Failed to parse response" });
      })
      .catch(() => setMe({ ok: false, error: "Network error" }));
  }, []);

  if (!me) return <p className="sub">Carregando sessão...</p>;

  if (!me.ok) {
    return <p style={{ color: "#b91c1c" }}>Sessão inválida: {me.error}</p>;
  }

  return <p className="sub">Logado como: {me.user.username}</p>;
}
