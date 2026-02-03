import { rotas } from "@/lib/rotas";
import { CtaLink } from "@/components/ui/CtaLink";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
      {/* Topbar (só na Home) */}
      <header className="flex items-center justify-between pt-6 sm:pt-8">
        <div className="flex items-center gap-3">
          <Image
            src="/logo-conserte-facil.png"
            alt="ConSERTE FÁCIL"
            width={36}
            height={36}
            className="logo-glow opacity-95 no-drag"
            draggable={false}
            priority
          />

          <div className="leading-tight">
            <p className="text-lg font-semibold tracking-tight text-dracula-text">ConSERTE FÁCIL</p>
            <p className="text-xs text-dracula-text/70">Assistência técnica de celulares</p>
          </div>
        </div>

        <div />
      </header>

      {/* Hero */}
      <section className="grid flex-1 grid-cols-1 items-center gap-8 py-12 lg:grid-cols-12 lg:py-16">
        <div className="col-span-12 lg:col-span-7">
          <h1 className="text-balance text-5xl font-semibold tracking-tight text-dracula-text">
            Encontre a assistência técnica ideal para seu aparelho.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-dracula-text/80">
            Diagnóstico claro, peças de procedência e acompanhamento do início ao fim. Atendimento focado em agendamento rápido e
            garantia nos serviços.
          </p>

          {/* CTA (mobile) - logo abaixo do texto */}
          <div className="mt-7 flex justify-center sm:hidden">
            <CtaLink
              href={rotas.agendamento.marca()}
              className="no-drag group inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-semibold
                         text-dracula-bg shadow-sm transition
                         bg-dracula-accent
                         hover:brightness-95
                         focus:outline-none focus:ring-2 focus:ring-dracula-accent/60 focus:ring-offset-0
                         ring-1 ring-black/10
                         shadow-[0_18px_45px_-20px_rgba(80,250,123,0.9)]
                         hover:shadow-[0_22px_55px_-22px_rgba(80,250,123,1)]
                         active:translate-y-[1px]"
              draggable={false}
            >
              Começar agendamento
              <span className="ml-2 inline-block translate-x-0 transition group-hover:translate-x-0.5">→</span>
            </CtaLink>
          </div>

          <div className="mt-8 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <CredCard title="Assistências" value="+2 Milhoes" subtitle="em serviços selecionados" />
            <CredCard title="Avaliação" value="4.9/5" subtitle="média dos clientes" />
            <CredCard title="Atendimento" value="Rápido" subtitle="agendamento simplificado" />
          </div>

          {/* CTA (desktop) */}
          <div className="mt-10 hidden items-center gap-4 sm:flex">
            <CtaLink
              href={rotas.agendamento.marca()}
              className="no-drag group inline-flex items-center justify-center rounded-2xl px-7 py-4 text-base font-semibold
                         text-dracula-bg shadow-sm transition
                         bg-dracula-accent
                         hover:brightness-95
                         focus:outline-none focus:ring-2 focus:ring-dracula-accent/60 focus:ring-offset-0
                         ring-1 ring-black/10
                         shadow-[0_18px_45px_-20px_rgba(80,250,123,0.9)]
                         hover:shadow-[0_22px_55px_-22px_rgba(80,250,123,1)]
                         active:translate-y-[1px]"
              draggable={false}
            >
              Começar agendamento
              <span className="ml-2 inline-block translate-x-0 transition group-hover:translate-x-0.5">→</span>
            </CtaLink>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-dracula-text/75">
            <Badge>Acesso de onde quiser</Badge>
            <Badge>Sem surpresas no preço</Badge>
            <Badge>Dados do cliente protegidos</Badge>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-5">
          <div className="rounded-2xl bg-white/[0.14] p-6 ring-1 ring-white/[0.20]  glass-fix">
            <h2 className="text-lg font-semibold text-dracula-text">Por que confiar na ConSERTE FÁCIL?</h2>

            <ul className="mt-5 space-y-4 text-sm text-dracula-text/80">
              <li className="flex gap-3">
                <Dot />
                <span>
                  <span className="font-semibold text-dracula-text">Checklist técnico</span> e registro do aparelho na entrada e na saída.
                </span>
              </li>
              <li className="flex gap-3">
                <Dot />
                <span>
                  <span className="font-semibold text-dracula-text">Peças com procedência</span> e teste de qualidade antes da entrega.
                </span>
              </li>
              <li className="flex gap-3">
                <Dot />
                <span>
                  <span className="font-semibold text-dracula-text">Acompanhamento</span> do status do serviço com atualização do andamento.
                </span>
              </li>
            </ul>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <MiniStat label="Prazo médio" value="1 – 5h" />
              <MiniStat label="Suporte pós-serviço" value="Garantia 90 dias" />
            </div>

            <div className="mt-6 rounded-xl bg-black/20 p-4 ring-1 ring-white/10">
              <p className="text-xs text-dracula-text/75">
                Dica: Ao fazer login em nosso site, você terá acesso ao chat em tempo real, ao histórico de serviços e aos códigos
                gerados, tudo organizado em um só lugar.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CredCard(props: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-2xl bg-dracula-card/35 p-4 ring-1 ring-white/10  glass-fix">
      <p className="text-xs font-medium text-dracula-text/70">{props.title}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-dracula-text">{props.value}</p>
      <p className="mt-1 text-xs text-dracula-text/70">{props.subtitle}</p>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-dracula-card/35 px-3 py-1 ring-1 ring-white/10  glass-fix">{children}</span>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-dracula-card/35 p-4 ring-1 ring-white/10  glass-fix">
      <p className="text-xs text-dracula-text/70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-dracula-text">{value}</p>
    </div>
  );
}

function Dot() {
  return <span className="mt-2 h-2 w-2 rounded-full bg-dracula-accent shadow-[0_0_20px_rgba(80,250,123,0.35)]" />;
}
