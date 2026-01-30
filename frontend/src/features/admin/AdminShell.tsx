import React from "react";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      <div className="flex flex-col md:flex-row gap-6">
        <AdminSidebar />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
