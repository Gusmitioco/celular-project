"use client";

import { useState } from "react";

export function SyncRequestButton({ code }: { code: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setMsg(null);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/requests/me/${encodeURIComponent(code)}/sync`, {
      method: "POST",
      credentials: "include",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      setMsg(data?.error ?? "Erro ao sincronizar");
      setLoading(false);
      return;
    }

    setMsg("Sincronizado ✅");
    setLoading(false);
  }

  return (
    <div>
      <button className="btn btnPrimary" type="button" onClick={sync} disabled={loading}>
        {loading ? "Sincronizando..." : "Sincronizar"}
      </button>
      {msg && <small style={{ display: "block", marginTop: 8 }}>{msg}</small>}
    </div>
  );
}
