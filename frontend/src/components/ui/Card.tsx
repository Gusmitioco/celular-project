import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      {...rest}
      className={[
        "glass-card glass-sheen p-6",
        "shadow-[0_20px_70px_-45px_rgba(0,0,0,0.8)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
