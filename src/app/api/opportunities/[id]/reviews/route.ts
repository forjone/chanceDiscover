import { NextRequest, NextResponse } from "next/server";
import { getOpportunity, getClusterReviews } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Raw evidence reviews behind an opportunity's pain cluster.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const opp = await getOpportunity(Number(params.id));
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
  const reviews = opp.clusterId ? await getClusterReviews(opp.clusterId) : [];
  return NextResponse.json({ reviews });
}
