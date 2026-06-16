import { NextRequest, NextResponse } from "next/server";
import { clearAllData, clearGeneratedArtifacts } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Data management. scope=artifacts clears clusters+opportunities only;
// scope=all wipes everything (apps, reviews, runs, trends included).
export async function POST(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope") || "artifacts";
  if (scope === "all") {
    await clearAllData();
    return NextResponse.json({ ok: true, scope: "all" });
  }
  await clearGeneratedArtifacts();
  return NextResponse.json({ ok: true, scope: "artifacts" });
}
