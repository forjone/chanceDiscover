import { NextResponse } from "next/server";
import { listActivity } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const activity = await listActivity(40);
  return NextResponse.json({ activity });
}
