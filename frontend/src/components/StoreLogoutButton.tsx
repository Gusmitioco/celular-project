"use client";

export function StoreLogoutButton() {
  async function logout() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/store-auth/logout`, {
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
