import { NextRequest, NextResponse } from "next/server";
import { searchAppStore } from "@/lib/collectors/appstore";
import { searchGooglePlay } from "@/lib/collectors/googleplay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Searches an app store for apps to track (Phase 1).
export async function GET(req: NextRequest) {
  const term = req.nextUrl.searchParams.get("term")?.trim();
  const platform = req.nextUrl.searchParams.get("platform") || "appstore";
  const country = req.nextUrl.searchParams.get("country") || process.env.APPSTORE_COUNTRY || "us";
  if (!term) return NextResponse.json({ error: "missing term" }, { status: 400 });

  try {
    const results =
      platform === "googleplay"
        ? await searchGooglePlay(term)
        : await searchAppStore(term, country);
    return NextResponse.json({ results, platform });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, results: [] }, { status: 200 });
  }
}
