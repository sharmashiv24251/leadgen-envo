const AUTH_STORAGE_KEY = "thc-command-center-auth";
const ACCOUNT_STORAGE_KEY = "thc-command-center-account";

// Both accounts are real Supabase-backed clients now -- there is no mock/demo account
// anymore. "thehrcompany" used to route to an in-memory fake dataset (lib/mockData.ts);
// it now routes to lib/thehrcompanyData.ts, same as "workenvo" always has.
export type Account = "workenvo" | "thehrcompany";

export const VALID_OPERATOR_ID = "thehrcompany";
export const VALID_ACCESS_KEY = "thehrcompany";

export const WORKENVO_EMAIL = "workenvo";
export const WORKENVO_PASSWORD = "workenvo";

/** Returns which account the given credentials belong to, or null if invalid. */
export function checkCredentials(id: string, secret: string): Account | null {
  if (id === VALID_OPERATOR_ID && secret === VALID_ACCESS_KEY) return "thehrcompany";
  if (id === WORKENVO_EMAIL && secret === WORKENVO_PASSWORD) return "workenvo";
  return null;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "granted";
}

/** Which account is logged in. Defaults to "thehrcompany" if unset/unknown. */
export function getAccount(): Account {
  if (typeof window === "undefined") return "thehrcompany";
  return window.localStorage.getItem(ACCOUNT_STORAGE_KEY) === "workenvo" ? "workenvo" : "thehrcompany";
}

export function grantAccess(account: Account): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, "granted");
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
}

export function revokeAccess(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}
