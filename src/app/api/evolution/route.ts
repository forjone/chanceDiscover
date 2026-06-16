import { NextResponse } from "next/server";
import { listEvolution } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const series = await listEvolution(24);
  return NextResponse.json({ series });
}
