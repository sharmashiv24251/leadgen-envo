import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("thc-auth");
  response.cookies.delete("thc-account");
  return response;
}
