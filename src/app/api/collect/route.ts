import { NextRequest, NextResponse } from "next/server";
import { collectAppReviews } from "@/lib/collect";
import { createRun, finishRun } from "@/db/repo";
import type { Platform } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Harvests real reviews from a store and ingests them (Phase 1 auto-collection).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const platform: Platform = body?.platform === "googleplay" ? "googleplay" : "appstore";
  const storeId: string = (body?.storeId || "").toString();
  const country: string = body?.country || process.env.APPSTORE_COUNTRY || "us";
  if (!storeId) return NextResponse.json({ error: "missing storeId" }, { status: 400 });

  const runId = await createRun("collect", { platform, storeId, country });
  try {
    const result = await collectAppReviews({
      platform,
      storeId,
      country,
      appName: body?.appName,
      category: body?.category,
      iconUrl: body?.iconUrl,
    });
    if (!result.ok) {
      await finishRun(runId, "failed", {}, result.error || "采集失败");
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    await finishRun(
      runId,
      "completed",
      { inserted: result.inserted, total: result.total, app: result.app },
      result.note || `从 ${result.app} 采集到 ${result.total} 条评论，新增 ${result.inserted} 条`
    );
    return NextResponse.json(result);
  } catch (err) {
    await finishRun(runId, "failed", {}, (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
