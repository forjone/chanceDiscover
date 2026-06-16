import { NextResponse } from "next/server";
import { listRuns } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const runs = await listRuns(40);
  return NextResponse.json({ runs });
}
