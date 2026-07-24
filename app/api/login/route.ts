import { NextResponse } from "next/server";
import { checkCredentials, createSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/serverAuth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const secret = typeof body?.secret === "string" ? body.secret : "";

  const account = checkCredentials(id, secret);
  if (!account) {
    return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ account });
  const baseCookie = {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };

  // httpOnly session token -- the actual security boundary, verified server-side by proxy.ts.
  response.cookies.set("thc-auth", createSessionToken(account), { ...baseCookie, httpOnly: true });
  // Plain, client-readable copy of just the account name (not secret) so client components
  // can pick a data source without an extra round trip -- mirrors the existing anon-key/RLS
  // trust model, not a new security boundary.
  response.cookies.set("thc-account", account, { ...baseCookie, httpOnly: false });

  return response;
}
