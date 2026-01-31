"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { apiBaseUrl } from "@/services/api";

type CityItem = { city: string; slug: string };

function fallbackTitleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export function Header() {
  const pathname = usePathname();
  const [cities, setCities] = useState<CityItem[]>([]);

  // If URL is /cidade/<slug>/...
  const citySlug = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] !== "city") return null;
    return parts[1] ?? null;
  }, [pathname]);

  useEffect(() => {
    // fetch once; cheap + keeps accents (São Paulo, etc.)
    fetch(`${apiBaseUrl}/api/cities`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCities(Array.isArray(data) ? data : []))
      .catch(() => setCities([]));
  }, []);

  const cityLabel = useMemo(() => {
    if (!citySlug) return null;
    const match = cities.find((c) => c.slug === citySlug);
    return match?.city ?? fallbackTitleFromSlug(citySlug);
  }, [cities, citySlug]);

  return (
    <div className="header">
      <div className="headerInner">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}>
          <span className="brandDot" />
          <span>TechFix</span>
        </Link>

        <div className="headerCenter">
          {cityLabel ? (
            <>
              <span style={{ color: "var(--primary)" }}>●</span>
              <span>{cityLabel}</span>
            </>
          ) : (
            <span />
          )}
        </div>

        <div className="headerRight">
          <span>Meus Pedidos</span>
          <span>Sair</span>
        </div>
      </div>
    </div>
  );
}
