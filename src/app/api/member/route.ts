import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight collaboration identity — just a display name in a cookie, used to
// attribute activity-log entries. Not authentication.
export async function GET(req: NextRequest) {
  return NextResponse.json({ member: req.cookies.get("miner_member")?.value || "" });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = String(body?.member || "").trim().slice(0, 24);
  const res = NextResponse.json({ ok: true, member: name });
  if (name) {
    res.cookies.set("miner_member", name, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  } else {
    res.cookies.set("miner_member", "", { path: "/", maxAge: 0 });
  }
  return res;
}
