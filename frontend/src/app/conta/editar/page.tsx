"use client";

import React from "react";
import { useRouter } from "next/navigation";

import { ClientShell } from "@/components/layout/ClientShell";
import { Card } from "@/components/ui/Card";
import HomeButton from "@/components/ui/HomeButton";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/services/api";
import { formatBRPhone, normalizeBRPhoneForStorage } from "@/lib/phone";

type Me = Awaited<ReturnType<typeof api.getMe>>;

export default function Page() {
  const router = useRouter();
  const { user, isLoading, refresh } = useAuth();

  const [me, setMe] = React.useState<Me | null>(null);
  const [loadingMe, setLoadingMe] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [pwCurrent, setPwCurrent] = React.useState("");
  const [pwNew, setPwNew] = React.useState("");
  const [pwConfirm, setPwConfirm] = React.useState("");
  const [pwSaving, setPwSaving] = React.useState(false);
  const [pwError, setPwError] = React.useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = React.useState<string | null>(null);

  const userId = user?.id ?? null;

  React.useEffect(() => {
    let mounted = true;

    if (!userId) {
      setMe(null);
      setName("");
      setPhone("");
      setError(null);
      setSuccess(null);
      setPwError(null);
      setPwSuccess(null);
      setLoadingMe(false);
      return () => {
        mounted = false;
      };
    }

    setLoadingMe(true);
    setError(null);
    setSuccess(null);

    (async () => {
      try {
        const data = await api.getMe();
        if (!mounted) return;
        setMe(data ?? null);
        setName(String((data as any)?.name ?? ""));
        setPhone(formatBRPhone(String((data as any)?.phone ?? "")));
      } catch {
        if (!mounted) return;
        setMe(null);
        setError("Não foi possível carregar seus dados. Tente atualizar a página.");
      } finally {
        if (!mounted) return;
        setLoadingMe(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const email = (me as any)?.email ?? user?.email ?? "";

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanName = name.trim();
    const cleanPhone = normalizeBRPhoneForStorage(phone);

    if (!cleanName) {
      setError("Informe seu nome.");
      return;
    }

    setSaving(true);
    try {
      await api.updateMe({ name: cleanName, phone: cleanPhone || undefined });
      await refresh();
      setSuccess("Dados atualizados!");
      // volta pra tela de conta
      router.push("/conta");
    } catch (err: any) {
      const code = err?.bodyJson?.error;
      const msg =
        code === "not_authenticated"
          ? "Sua sessão expirou. Faça login novamente."
          : code === "phone_invalid"
            ? "Telefone inválido. Use DDD + número (10 ou 11 dígitos)."
            : "Não foi possível salvar. Tente novamente.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    const currentPassword = pwCurrent;
    const newPassword = pwNew;
    const newPasswordConfirm = pwConfirm;

    if (!currentPassword) {
      setPwError("Informe sua senha atual.");
      return;
    }
    if (!newPassword) {
      setPwError("Informe a nova senha.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("A nova senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPasswordConfirm !== newPassword) {
      setPwError("A confirmação não confere.");
      return;
    }

    setPwSaving(true);
    try {
      await api.updatePassword({ currentPassword, newPassword, newPasswordConfirm });
      setPwSuccess("Senha atualizada!");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
    } catch (err: any) {
      const code = err?.bodyJson?.error;
      if (code === "not_authenticated") setPwError("Sua sessão expirou. Faça login novamente.");
      else if (code === "invalid_current_password") setPwError("Senha atual inválida.");
      else if (code === "password_weak") setPwError("A nova senha precisa ter letras e números.");
      else if (code === "password_too_short") setPwError("A nova senha precisa ter pelo menos 8 caracteres.");
      else if (code === "password_mismatch") setPwError("A confirmação não confere.");
      else setPwError("Não foi possível trocar a senha. Tente novamente.");
    } finally {
      setPwSaving(false);
    }
  };

  const isLoadingAll = isLoading || loadingMe;

  return (
    <ClientShell
      title="Editar conta"
      header={
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Editar conta</h1>
            <p className="mt-1 text-sm text-white/70">Atualize seu nome e telefone.</p>
          </div>

          <span className="select-none rounded-full bg-white/[0.10] px-3 py-1 text-xs text-white/70 ring-1 ring-white/[0.14]">
            Perfil
          </span>
        </div>
      }
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <HomeButton href="/" className="w-full sm:w-auto sm:min-w-[150px]" />

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <BackButton
              className="w-full sm:w-auto"
              onClick={() => router.push("/conta")}
              label="Voltar"
            />
            <Button
              type="submit"
              form="edit-account-form"
              variant="secondary"
              disabled={!user || saving || isLoadingAll}
              className="w-full sm:w-auto sm:min-w-[160px] rounded-2xl bg-white/[0.10] text-white ring-1 ring-white/[0.14] hover:bg-white/[0.14] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_0_0_6px_rgba(255,255,255,0.14)] transition"
            >
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      }
      footerContainerClassName="px-4 pb-6 sm:px-6 sm:pb-7 lg:px-10 overflow-visible"
      maxWidthClassName="max-w-6xl"
    >
      <div className="space-y-6">
        <Card className="relative overflow-hidden rounded-3xl bg-white/[0.08] ring-1 ring-white/[0.14] shadow-[0_30px_90px_-55px_rgba(0,0,0,0.75)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-[2px] opacity-70"
            style={{
              background:
                "linear-gradient(120deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 28%, rgba(168,85,247,0.10) 62%, rgba(0,0,0,0) 100%)",
            }}
          />

          <div className="relative p-6 sm:p-8">
            {isLoadingAll ? (
              <div className="space-y-4">
                <div className="h-6 w-56 rounded-lg bg-white/10" />
                <div className="h-12 w-full rounded-2xl bg-white/10" />
                <div className="h-12 w-full rounded-2xl bg-white/10" />
                <div className="h-12 w-full rounded-2xl bg-white/10" />
              </div>
            ) : !user ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Você não está logado</h2>
                  <p className="mt-1 text-sm text-white/70">Faça login para editar seus dados.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant="secondary"
                    className="min-w-[160px] rounded-2xl bg-white/[0.12] text-white ring-1 ring-white/[0.16] hover:bg-white/[0.16] hover:-translate-y-[1px] active:translate-y-[1px] transition"
                    onClick={() => (window.location.href = "/login")}
                  >
                    Login
                  </Button>

                  <Button
                    variant="secondary"
                    className="min-w-[160px] rounded-2xl bg-white/[0.08] text-white ring-1 ring-white/[0.14] hover:bg-white/[0.12] hover:-translate-y-[1px] active:translate-y-[1px] transition"
                    onClick={() => (window.location.href = "/cadastro")}
                  >
                    Criar conta
                  </Button>
                </div>
              </div>
            ) : (
              <form id="edit-account-form" onSubmit={onSave} className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">Dados da conta</h2>
                  <p className="mt-1 text-sm text-white/70">
                    E-mail não pode ser alterado por aqui (por enquanto).
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Nome</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      autoComplete="name"
                      maxLength={80}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Telefone / WhatsApp</label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(formatBRPhone(e.target.value))}
                      placeholder="(DDD) 9xxxx-xxxx"
                      autoComplete="tel"
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-xs text-white/60">E-mail</label>
                    <Input value={email} readOnly disabled className="opacity-80" />
                  </div>
                </div>

                {error ? (
                  <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/20">
                    {error}
                  </p>
                ) : null}

                {success ? (
                  <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 ring-1 ring-emerald-400/20">
                    {success}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </Card>

        {/* Password */}
        <Card className="relative overflow-hidden rounded-3xl bg-white/[0.06] ring-1 ring-white/[0.12]">
          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-semibold text-white">Trocar senha</h2>
              <p className="text-sm text-white/70">Mínimo 8 caracteres, com letras e números.</p>
            </div>

            {!user ? (
              <p className="mt-4 text-sm text-white/70">Faça login para trocar sua senha.</p>
            ) : (
              <form onSubmit={onChangePassword} className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Senha atual</label>
                    <Input
                      type="password"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Nova senha</label>
                    <Input
                      type="password"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/60">Confirmar nova senha</label>
                    <Input
                      type="password"
                      value={pwConfirm}
                      onChange={(e) => setPwConfirm(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {pwError ? (
                  <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/20">
                    {pwError}
                  </p>
                ) : null}

                {pwSuccess ? (
                  <p className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 ring-1 ring-emerald-400/20">
                    {pwSuccess}
                  </p>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={pwSaving || isLoadingAll}
                    className="w-full sm:w-auto sm:min-w-[180px] rounded-2xl bg-white/[0.10] text-white ring-1 ring-white/[0.14] hover:bg-white/[0.14] hover:-translate-y-[1px] active:translate-y-[1px] transition"
                  >
                    {pwSaving ? "Salvando…" : "Atualizar senha"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>
      </div>
    </ClientShell>
  );
}
