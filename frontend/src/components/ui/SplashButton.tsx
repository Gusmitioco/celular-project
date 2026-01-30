"use client";

import React from "react";
import clsx from "clsx";
import { Button } from "./Button";

type Props = Omit<React.ComponentProps<typeof Button>, "variant"> & {
  /**
   * Aplica a animação tipo "splash" (bubbly) no clique.
   * Mantém o comportamento normal do onClick.
   */
  splash?: boolean;
};

/**
 * Botão com efeito de splash no clique (bubbly).
 * A animação é feita via CSS (globals.css) e NÃO pode gerar scroll/overflow na página.
 */
export function SplashButton({
  className,
  onClick,
  splash = true,
  type,
  ...props
}: Props) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!props.disabled && splash) {
      const el = e.currentTarget;
      el.classList.remove("splash-animate");
      // força reflow para reiniciar a animação
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      void el.offsetWidth;
      el.classList.add("splash-animate");
      window.setTimeout(() => el.classList.remove("splash-animate"), 700);
    }
    onClick?.(e);
  };

  return (
    <Button
      variant="confirm"
      {...props}
      type={type ?? "button"}
      onClick={handleClick}
      className={clsx("splash-button", className)}
    />
  );
}
