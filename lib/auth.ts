// Client-side auth helpers. Credential checking and session signing now live server-side
// (lib/serverAuth.ts, app/api/login, proxy.ts) -- this file only reads the non-sensitive
// "which account" cookie the server sets alongside the httpOnly session cookie, and calls
// the login/logout API routes. It intentionally holds no secrets.
export type Account = "workenvo" | "thehrcompany";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function isAuthenticated(): boolean {
  return readCookie("thc-account") !== null;
}

/** Which account is logged in. Defaults to "thehrcompany" if unset/unknown. */
export function getAccount(): Account {
  return readCookie("thc-account") === "workenvo" ? "workenvo" : "thehrcompany";
}

/** Returns the account on success, or null if the credentials were rejected. */
export async function login(id: string, secret: string): Promise<Account | null> {
  const res = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, secret }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.account === "workenvo" || data.account === "thehrcompany" ? data.account : null;
}

export async function revokeAccess(): Promise<void> {
  await fetch("/api/logout", { method: "POST" });
}
