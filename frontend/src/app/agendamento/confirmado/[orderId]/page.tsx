"use client";

import React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { rotas } from "@/lib/rotas";
import { api } from "@/services/api";

export default function Page({ params }: { params: { orderId: string } }) {
  const code = params.orderId;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [storeName, setStoreName] = React.useState<string | null>(null);
  const [storeAddress, setStoreAddress] = React.useState<string | null>(null);
  const [storeCity, setStoreCity] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    api
      .getOrder(code)
      .then((o: any) => {
        if (!mounted) return;
        setStoreName(o.storeName ?? null);
        setStoreAddress(o.storeAddress ?? null);
        setStoreCity(o.city ?? null);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-dracula-text">Pedido confirmado</h1>
        <p className="mt-2 text-sm text-dracula-text/75">Seu pedido foi registrado. Guarde o código abaixo.</p>
      </div>

      {error ? <div className="text-sm text-dracula-accent2">Erro: {error}</div> : null}

      <Card>
        <div className="text-xs font-semibold text-dracula-text/70">Código do pedido</div>
        <div className="mt-3 font-mono text-2xl text-dracula-text">{code}</div>

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
            Se você estiver logado, este pedido vai aparecer em <span className="font-semibold">Meus Pedidos</span>.
          </p>
        </div>
      </Card>

      <Link className="inline-flex text-sm font-semibold text-dracula-accent hover:brightness-95" href={rotas.home()}>
        Voltar para a Home →
      </Link>
    </div>
  );
}
