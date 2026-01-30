import React from "react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={[
        "rounded-2xl bg-white/[0.14] p-6 ring-1 ring-white/[0.20]  glass-fix",
        "shadow-[0_20px_70px_-45px_rgba(0,0,0,0.8)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
