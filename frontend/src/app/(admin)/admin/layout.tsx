import "./admin.css";
import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin">
      <main className="adminMain">{children}</main>
    </div>
  );
}
