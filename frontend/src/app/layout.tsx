import type { Metadata } from "next";
import "@/styles/globals.css";

import "@fontsource/line-seed-jp/400.css";
import "@fontsource/line-seed-jp/700.css";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteBackground } from "@/components/layout/SiteBackground";
import { AuthProvider } from "@/components/auth/AuthProvider";


export const metadata: Metadata = {
  title: "ConSERT FÁCIL",
  description: "Assistência técnica",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>
          <SiteBackground>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </SiteBackground>
        </AuthProvider>
      </body>
    </html>
  );
}
