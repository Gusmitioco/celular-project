"use client";

import React from "react";
import Link, { LinkProps } from "next/link";
import clsx from "clsx";

type Props = LinkProps & {
  children: React.ReactNode;
  className?: string;
  /** Cor do flash (box-shadow) no clique. */
  flashColor?: string;
};

/**
 * Link com "flash" de sombra no clique (igual aos botões do fluxo),
 * sem alterar a aparência base.
 */
export function CtaLink({ className, children, flashColor = "rgba(80, 250, 123, 0.95)", ...props }: Props) {
  const [flash, setFlash] = React.useState(false);

  // @ts-expect-error next/link accepts anchor props (style/onPointerDown)
  const { style, onPointerDown, ...rest } = props as any;

  return (
    <Link
      {...rest}
      draggable={false}
      onPointerDown={(e: React.PointerEvent<HTMLAnchorElement>) => {
        setFlash(true);
        window.setTimeout(() => setFlash(false), 240);
        onPointerDown?.(e);
      }}
      className={clsx("no-drag", className, flash && "flash-shadow")}
      style={{
        // @ts-expect-error CSS var
        "--flash": flashColor,
        // evita arrastar como link no Chrome
        WebkitUserDrag: "none",
        ...(style || {}),
      }}
    >
      {children}
    </Link>
  );
}
