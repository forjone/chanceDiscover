import { NextRequest, NextResponse } from "next/server";
import { getApp, deleteApp } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const app = await getApp(Number(params.id));
  if (!app) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ app });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteApp(Number(params.id));
  return NextResponse.json({ ok: true });
}
