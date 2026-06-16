import { NextRequest, NextResponse } from "next/server";
import { searchOpportunities, searchReviews } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Global search across opportunities and reviews.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ opportunities: [], reviews: [] });
  const [opportunities, reviews] = await Promise.all([
    searchOpportunities(q, 30),
    searchReviews(q, 30),
  ]);
  return NextResponse.json({ opportunities, reviews });
}
