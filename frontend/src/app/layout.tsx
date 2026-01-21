import "./global.css";
import type { ReactNode } from "react";
import { Header } from "../components/Header";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
