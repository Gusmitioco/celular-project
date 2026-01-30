import React from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: Props) {
  return (
    <input
      className={[
        "w-full rounded-xl px-3 py-2 text-sm",
        "bg-black/20 text-dracula-text placeholder:text-dracula-text/45",
        "ring-1 ring-white/[0.18]  glass-fix",
        "outline-none focus:ring-2 focus:ring-dracula-accent/60",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
