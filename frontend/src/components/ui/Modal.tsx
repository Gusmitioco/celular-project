"use client";

import React from "react";
import { Card } from "./Card";
import { Button } from "./Button";

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-lg">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-dracula-text">{title}</h3>
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
        <div className="mt-4">{children}</div>
      </Card>
    </div>
  );
}
