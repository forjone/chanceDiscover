import { NextResponse } from "next/server";
import { listTrends } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const trends = await listTrends(40);
  const hasYoutubeKey = Boolean(process.env.YOUTUBE_API_KEY);
  return NextResponse.json({ trends, source: hasYoutubeKey ? "youtube" : "reviews" });
}
