"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { rotas } from "@/lib/rotas";
import { api } from "@/services/api";
import { useAuth } from "@/components/auth/AuthProvider";

function statusPT(status: string) {
  const s = (status || "").toLowerCase().trim();
  const map: Record<string, string> = {
    created: "Criado",
    in_progress: "Em andamento",
    done: "Concluído",
    cancelled: "Cancelado",
  };
  return map[s] ?? status;
}

export default function Page() {
  // Next.js (App Router) may pass params as a Promise to Client Components.
  // Use the navigation hook instead of accessing props directly.
  const params = useParams();
  const rawOrderId = (params as any)?.orderId;
  const code = String(Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId ?? "")
    .trim()
    .toUpperCase();

  const { user } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [storeName, setStoreName] = React.useState<string | null>(null);
  const [storeAddress, setStoreAddress] = React.useState<string | null>(null);
  const [storeCity, setStoreCity] = React.useState<string | null>(null);
  const [modelName, setModelName] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<string | null>(null);
  const [totalCents, setTotalCents] = React.useState<number | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    if (!code) {
      setError("Código do pedido inválido");
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    api
      .getOrder(code)
      .then((o: any) => {
        if (!mounted) return;
        setStoreName(o.storeName ?? null);
        setStoreAddress(o.storeAddress ?? null);
        setStoreCity(o.city ?? null);
        setModelName(o.modelName ?? null);
        setStatus(o.status ?? null);
        setTotalCents(typeof o.totalCents === "number" ? o.totalCents : null);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || "Erro ao carregar detalhes do pedido");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [code]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // ignore
    }
  };

  const loginHref = `/login?returnTo=${encodeURIComponent(`/agendamento/confirmado/${code}`)}`;
  const cadastroHref = `/cadastro?returnTo=${encodeURIComponent(`/agendamento/confirmado/${code}`)}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Pedido confirmado</h1>
        <p className="mt-2 text-sm text-dracula-text/75">
          Seu pedido foi registrado com sucesso. Guarde o código abaixo — é ele que identifica o seu atendimento.
        </p>
      </div>

      {error ? <div className="text-sm text-dracula-accent2">Erro: {error}</div> : null}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-dracula-text/70">Código do pedido</div>
            <div className="mt-3 font-mono text-2xl text-dracula-text">{code}</div>
            <button
              type="button"
              onClick={onCopy}
              className="mt-2 text-xs font-semibold text-dracula-accent hover:brightness-95"
            >
              Copiar código
            </button>

            {modelName ? (
              <div className="mt-4">
                <div className="text-xs font-semibold text-dracula-text/70">Modelo</div>
                <div className="mt-1 text-sm font-semibold text-dracula-text">{modelName}</div>
              </div>
            ) : null}
          </div>

          <div className="text-right">
            {status ? (
              <>
                <div className="text-xs font-semibold text-dracula-text/70">Status</div>
                <div className="mt-1 text-base font-bold text-dracula-text">{statusPT(status)}</div>
              </>
            ) : null}

            {typeof totalCents === "number" ? (
              <>
                <div className="mt-3 text-xs font-semibold text-dracula-text/70">Total</div>
                <div className="mt-1 text-base font-semibold text-dracula-text">
                  R$ {(totalCents / 100).toFixed(2).replace(".", ",")}
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
          <div className="text-xs font-semibold text-dracula-text/70">Endereço da assistência</div>
          {loading ? (
            <p className="mt-2 text-xs text-dracula-text/70">Carregando…</p>
          ) : storeAddress ? (
            <p className="mt-2 text-sm text-dracula-text">
              {storeName ? <span className="font-semibold">{storeName}</span> : null}
              {storeName ? <span className="text-dracula-text/60"> • </span> : null}
              {storeAddress}
              {storeCity ? <span className="text-dracula-text/60"> — {storeCity}</span> : null}
            </p>
          ) : (
            <p className="mt-2 text-xs text-dracula-text/70">Endereço indisponível no momento.</p>
          )}

          <p className="mt-3 text-xs text-dracula-text/75">
            Se você estiver logado, este pedido aparece em <span className="font-semibold">Meus Pedidos</span> e você
            pode acompanhar o status e usar o chat quando o atendimento iniciar.
          </p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
            <div className="text-xs font-semibold text-dracula-text/70">Próximos passos</div>
            <ul className="mt-2 space-y-2 text-sm text-dracula-text/80">
              <li>• Leve o aparelho na assistência e informe o código do pedido.</li>
              <li>• A equipe confirma o atendimento e atualiza o status do seu pedido.</li>
              <li>• Quando estiver em andamento, o chat fica disponível (se você estiver logado).</li>
            </ul>
          </div>

          <div className="rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
            <div className="text-xs font-semibold text-dracula-text/70">Acompanhar pelo site</div>
            {user ? (
              <p className="mt-2 text-sm text-dracula-text/80">
                Você já está logado. Veja este pedido em <span className="font-semibold">Meus Pedidos</span>.
              </p>
            ) : (
              <p className="mt-2 text-sm text-dracula-text/80">
                Faça login ou crie uma conta para guardar seus pedidos, acompanhar status e acessar o chat.
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {user ? (
                <Link
                  href={`/meus-pedidos/${encodeURIComponent(code)}`}
                  className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white"
                >
                  Abrir pedido
                </Link>
              ) : (
                <>
                  <Link
                    href={loginHref}
                    className="rounded-xl bg-white/[0.14] px-4 py-2 text-sm font-semibold text-dracula-text ring-1 ring-white/[0.20] glass-fix transition hover:bg-white/[0.18]"
                  >
                    Fazer login
                  </Link>
                  <Link
                    href={cadastroHref}
                    className="rounded-xl bg-white/90 px-4 py-2 text-sm font-semibold text-dracula-bg ring-1 ring-white/20 transition hover:bg-white"
                  >
                    Criar conta
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Link className="inline-flex text-sm font-semibold text-dracula-accent hover:brightness-95" href={rotas.home()}>
        Voltar para a Home →
      </Link>
    </div>
  );
}
