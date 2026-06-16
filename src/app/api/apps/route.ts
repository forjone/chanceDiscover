import { NextResponse } from "next/server";
import { listApps } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const apps = await listApps();
  return NextResponse.json({ apps });
}
