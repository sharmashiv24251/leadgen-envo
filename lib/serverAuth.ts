import { createHmac, timingSafeEqual } from "crypto";

// Server-only: credentials and session signing never reach the client bundle.
// (Importing "crypto" from client code fails the build, which is the guard here --
// no separate "server-only" package needed for a file this small.)

export type Account = "workenvo" | "thehrcompany";

const VALID_OPERATOR_ID = "thehrcompany";
const VALID_ACCESS_KEY = "thehrcompany";

// Second login for the same "thehrcompany" account/dashboard (e.g. for Bianca),
// distinct credentials but identical data access -- not a separate tenant.
const BIANCA_OPERATOR_ID = "bianca_the_hr_company";
const BIANCA_ACCESS_KEY = "nTvATSqKXTI8Fb4amsVO";

const WORKENVO_EMAIL = "workenvo";
const WORKENVO_PASSWORD = "workenvo";

export function checkCredentials(id: string, secret: string): Account | null {
  if (id === VALID_OPERATOR_ID && secret === VALID_ACCESS_KEY) return "thehrcompany";
  if (id === BIANCA_OPERATOR_ID && secret === BIANCA_ACCESS_KEY) return "thehrcompany";
  if (id === WORKENVO_EMAIL && secret === WORKENVO_PASSWORD) return "workenvo";
  return null;
}

function getSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) {
    throw new Error("AUTH_COOKIE_SECRET env var is required (see .env.local)");
  }
  return secret;
}

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionToken(account: Account): string {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `${account}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): Account | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [account, expiresStr, signature] = parts;
  if (account !== "workenvo" && account !== "thehrcompany") return null;

  const expected = sign(`${account}.${expiresStr}`);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length || !timingSafeEqual(actualBuf, expectedBuf)) {
    return null;
  }

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return null;

  return account;
}
