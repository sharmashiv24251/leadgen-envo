import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/serverAuth";

// The real login gate -- runs server-side before any page renders, so it can't be bypassed
// by editing client-side state. Next.js 16 renamed "middleware" to "proxy" (see AGENTS.md).
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const account = verifySessionToken(request.cookies.get("thc-auth")?.value);

  if (pathname === "/login") {
    return account ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!account) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
