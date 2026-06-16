import { NextRequest, NextResponse } from "next/server";
import { listReviews } from "@/db/repo";
import { ingestReviews, parseManualReviews } from "@/lib/ingest";
import type { Platform } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const appId = req.nextUrl.searchParams.get("appId");
  const reviews = await listReviews({ appId: appId ? Number(appId) : undefined, limit: 300 });
  return NextResponse.json({ reviews });
}

// Manual review ingestion (MVP path).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid JSON" }, { status: 400 });

  const appName: string = (body.appName || "手动录入").toString().trim();
  const platform: Platform = body.platform === "googleplay" ? "googleplay" : "appstore";
  const storeId: string = (body.storeId || `manual-${slug(appName)}`).toString();
  const raw: string = (body.text || "").toString();

  const reviews = parseManualReviews(raw);
  if (reviews.length === 0) {
    return NextResponse.json({ error: "未解析到任何评论" }, { status: 400 });
  }

  const result = await ingestReviews({
    appName,
    platform,
    storeId,
    country: body.country || "manual",
    reviews,
  });
  return NextResponse.json({ ok: true, ...result });
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
}
