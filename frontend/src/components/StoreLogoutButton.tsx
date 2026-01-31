"use client";

import { apiBaseUrl } from "@/services/api";

export function StoreLogoutButton() {
  async function logout() {
    await fetch(`${apiBaseUrl}/api/store-auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => null);

    window.location.href = "/store/login";
  }

  return (
    <button className="btn" type="button" onClick={logout}>
      Sair
    </button>
  );
}
