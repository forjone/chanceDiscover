import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authEnabled, passwordToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Login: validate the password, set the auth cookie.
export async function POST(req: NextRequest) {
  if (!authEnabled()) return NextResponse.json({ ok: true, disabled: true });
  const body = await req.json().catch(() => null);
  const password = String(body?.password || "");
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "密码错误" }, { status: 401 });
  }
  const token = await passwordToken(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

// Logout: clear the cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
