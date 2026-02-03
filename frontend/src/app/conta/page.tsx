"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import ClientShell from "@/components/layout/ClientShell";
import { Card, CardContent } from "@/components/ui/Card";
import HomeButton from "@/components/ui/HomeButton";
import Button from "@/components/ui/Button";
import { api } from "@/services/api";

type Me = Awaited<ReturnType<typeof api.auth.me>>;

export default function Page() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await api.auth.me();
        if (!mounted) return;
        setMe(data);
      } catch (e: any) {
        if (!mounted) return;
        setMe(null);
        // sem login -> tudo bem
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // mantém valores do form alinhados com o usuário carregado
  useEffect(() => {
    if (!me) return;
    // tentativa de mapear campos comuns sem quebrar caso não existam
    const anyMe: any = me as any;
    setName(String(anyMe?.name ?? anyMe?.nome ?? ""));
    setPhone(String(anyMe?.phone ?? anyMe?.telefone ?? anyMe?.whatsapp ?? ""));
  }, [me]);

  const displayName = useMemo(() => {
    const anyMe: any = me as any;
    return String(anyMe?.name ?? anyMe?.nome ?? anyMe?.email ?? "Usuário");
  }, [me]);

  async function onLogout() {
    try {
      await api.auth.logout();
      window.location.href = "/";
    } catch (e: any) {
      setError(e?.message ?? "Falha ao sair");
    }
  }

  // por enquanto é UI (endpoint de update pode entrar depois)
  async function onSaveProfile() {
    setError(null);
    // Ainda não há endpoint estável de update no api.ts.
    // Quando definirmos, é só implementar aqui.
    setError(
      "Ainda não dá pra salvar alterações por aqui. Em breve vamos habilitar a edição de conta."
    );
  }

  return (
    <ClientShell title="Conta" maxWidthClassName="max-w-4xl">
      <div className="flex items-center justify-between">
        <HomeButton />
        <div className="text-right">
          <div className="text-sm text-dracula-text/60">Sua conta</div>
        </div>
      </div>

      <div className="mt-6">
        <Card>
          <CardContent className="flex min-h-[260px] flex-col gap-4">
            {loading ? (
              <div className="text-dracula-text/70">Carregando…</div>
            ) : me ? (
              <>
                <div>
                  <div className="text-xl font-semibold">{displayName}</div>
                  <div className="mt-1 text-sm text-dracula-text/60">
                    Aqui você vai poder ajustar dados da sua conta e acompanhar seus pedidos.
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="text-xs text-dracula-text/60">Nome</div>
                    <div className="mt-1 text-sm text-dracula-text/90">
                      {name || "—"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="text-xs text-dracula-text/60">Telefone / WhatsApp</div>
                    <div className="mt-1 text-sm text-dracula-text/90">
                      {phone || "—"}
                    </div>
                  </div>
                </div>

                {editing ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="text-sm font-semibold">Editar conta</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="space-y-1">
                        <div className="text-xs text-dracula-text/60">Nome</div>
                        <input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-dracula-text placeholder:text-dracula-text/40 outline-none transition focus:border-white/20"
                          placeholder="Seu nome"
                        />
                      </label>
                      <label className="space-y-1">
                        <div className="text-xs text-dracula-text/60">Telefone / WhatsApp</div>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-dracula-text placeholder:text-dracula-text/40 outline-none transition focus:border-white/20"
                          placeholder="(00) 00000-0000"
                        />
                      </label>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <Button
                        onClick={onSaveProfile}
                        className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white/90 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/90 hover:text-dracula-bg"
                      >
                        Salvar
                      </Button>
                      <button
                        onClick={() => setEditing(false)}
                        className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.06]"
                      >
                        Cancelar
                      </button>
                      <div className="text-xs text-dracula-text/60">
                        Alteração de senha entra numa próxima etapa.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-dracula-text/60">
                    Dica: depois do login, seus pedidos ficam salvos e você consegue acompanhar o status.
                  </div>
                )}

                {error && (
                  <div className="rounded-xl border border-pink-400/30 bg-pink-400/10 p-3 text-sm text-pink-200">
                    {error}
                  </div>
                )}

                <div className="mt-auto flex w-full items-center justify-between gap-3">
                  <button
                    onClick={() => setEditing((v) => !v)}
                    className="h-12 w-44 select-none rounded-full border border-white/15 bg-white/[0.06] px-4 text-[15px] font-semibold text-white/90 backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white/90 hover:text-dracula-bg"
                  >
                    {editing ? "Fechar edição" : "Editar conta"}
                  </button>

                  <button
                    onClick={onLogout}
                    className="h-12 w-44 select-none rounded-full border border-red-400/25 bg-red-500/15 px-4 text-[15px] font-semibold text-red-100 backdrop-blur-sm transition-all duration-500 ease-out hover:-translate-y-0.5 hover:border-red-300/40 hover:bg-red-500/25 hover:shadow-[0_0_24px_rgba(239,68,68,0.18)]"
                  >
                    Sair
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="text-xl font-semibold">Você não está logado</div>
                  <div className="mt-1 text-sm text-dracula-text/60">
                    Faça login para salvar pedidos, acompanhar o status e usar o chat em tempo real.
                  </div>
                </div>

                <div className="mt-auto flex w-full items-center justify-between gap-3">
                  <HomeButton />
                  <div className="flex gap-3">
                    <Link
                      href="/login"
                      className="h-12 w-44 select-none rounded-full bg-white/90 px-4 text-center text-[15px] font-semibold leading-[48px] text-dracula-bg transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-white"
                    >
                      Login
                    </Link>
                    <Link
                      href="/cadastro"
                      className="h-12 w-44 select-none rounded-full border border-white/15 bg-white/[0.06] px-4 text-center text-[15px] font-semibold leading-[48px] text-white/90 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.10]"
                    >
                      Criar conta
                    </Link>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </ClientShell>
  );
}
