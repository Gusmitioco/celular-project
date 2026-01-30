import React from "react";
import clsx from "clsx";

const steps = ["Marca", "Modelo", "Serviços", "Resumo"] as const;

export function StepsNav({ current, finalized = false }: { current: 0 | 1 | 2 | 3; finalized?: boolean }) {
  return (
    <div className={clsx("flex items-center justify-center gap-8 pb-8 font-steps")}>
      {steps.map((label, idx) => {
        // Importante: não deixe "active" competir com "done".
        // Em Tailwind, a ordem de utilitários no CSS pode fazer o "text-*" do active
        // sobrepor o do done, mesmo se done estiver presente na string de classes.
        const done = finalized ? idx <= current : idx < current;
        const active = idx === current && !done;

        return (
          <div
            key={label}
            className={clsx(
              "text-sm font-bold transition",
              // padrão
              !active && !done && "text-dracula-subtext/60",
              // ativo (roxo, mas um pouco “vivo”)
              active && "text-dracula-subtext",
              // concluído (verde + brilho discreto)
              done && "text-dracula-accent"
            )}
            style={
              done
                ? {
                    textShadow: "0 0 10px rgba(80,250,123,0.35)",
                    letterSpacing: "0.2px",
                  }
                : active
                ? {
                    textShadow: "0 0 10px rgba(189,147,249,0.25)",
                    letterSpacing: "0.2px",
                  }
                : undefined
            }
          >
            {label}
          </div>
        );
      })}
    </div>
  );
}
