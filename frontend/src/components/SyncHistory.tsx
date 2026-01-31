import { apiGet } from "../lib/api";

type Row = {
  id: number;
  target: string;
  status: string;
  http_status: number | null;
  created_at: string;
};

export async function SyncHistory({ code }: { code: string }) {
  let rows: Row[] = [];
  try {
    const data = await apiGet<{ ok: true; rows: Row[] }>(`/requests/me/${encodeURIComponent(code)}/syncs`);
    rows = data.rows;
  } catch {
    rows = [];
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Histórico de sincronização</div>

      {rows.length === 0 ? (
        <div className="surface" style={{ padding: 14 }}>
          <p style={{ margin: 0 }}>Nenhuma sincronização ainda.</p>
        </div>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {rows.map((r) => (
            <div key={r.id} className="surface" style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    {r.status === "success" ? "✅ Sucesso" : "⚠️ Erro"}
                  </div>
                  <div className="cardMeta" style={{ marginTop: 4 }}>
                    {r.target}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900 }}>{r.http_status ?? "-"}</div>
                  <div className="cardMeta">{new Date(r.created_at).toLocaleString("pt-BR")}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
