const AUTH_STORAGE_KEY = "thc-command-center-auth";

export const VALID_OPERATOR_ID = "thehrcompany";
export const VALID_ACCESS_KEY = "thehrcompany";

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) === "granted";
}

export function grantAccess(): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, "granted");
}

export function revokeAccess(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}
