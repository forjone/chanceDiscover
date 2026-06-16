import { NextRequest, NextResponse } from "next/server";
import { listOpportunities } from "@/db/repo";
import type { OpportunityStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") as OpportunityStatus | null;
  const tag = req.nextUrl.searchParams.get("tag");
  const opportunities = await listOpportunities({
    status: status || undefined,
    tag: tag || undefined,
    limit: 200,
  });
  return NextResponse.json({ opportunities });
}
