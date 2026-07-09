const AUTH_STORAGE_KEY = "thc-command-center-auth";
const ACCOUNT_STORAGE_KEY = "thc-command-center-account";

export type Account = "mock" | "workenvo";

export const VALID_OPERATOR_ID = "thehrcompany";
export const VALID_ACCESS_KEY = "thehrcompany";

export const WORKENVO_EMAIL = "saransh@workenvo.com";
export const WORKENVO_PASSWORD = "$aransh@workenvo.com";

/** Returns which account the given credentials belong to, or null if invalid. */
export function checkCredentials(id: string, secret: string): Account | null {
  if (id === VALID_OPERATOR_ID && secret === VALID_ACCESS_KEY) return "mock";
  if (id === WORKENVO_EMAIL && secret === WORKENVO_PASSWORD) return "workenvo";
  return null;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "granted";
}

/** Which account is logged in. Defaults to "mock" if unset/unknown. */
export function getAccount(): Account {
  if (typeof window === "undefined") return "mock";
  return window.localStorage.getItem(ACCOUNT_STORAGE_KEY) === "workenvo" ? "workenvo" : "mock";
}

export function grantAccess(account: Account): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, "granted");
  window.localStorage.setItem(ACCOUNT_STORAGE_KEY, account);
}

export function revokeAccess(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.localStorage.removeItem(ACCOUNT_STORAGE_KEY);
}
