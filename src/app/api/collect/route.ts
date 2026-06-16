import { NextRequest, NextResponse } from "next/server";
import { fetchAppStoreReviews, lookupApp } from "@/lib/collectors/appstore";
import { fetchGooglePlayReviews, lookupGooglePlayApp } from "@/lib/collectors/googleplay";
import { ingestReviews } from "@/lib/ingest";
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
    let meta = body?.appName
      ? { storeId, name: String(body.appName), category: body?.category ?? null, iconUrl: body?.iconUrl ?? null }
      : null;
    if (!meta) {
      meta =
        platform === "googleplay"
          ? await lookupGooglePlayApp(storeId)
          : await lookupApp(storeId, country);
    }
    if (!meta) {
      await finishRun(runId, "failed", {}, "无法解析应用信息");
      return NextResponse.json({ error: "无法解析应用信息" }, { status: 404 });
    }

    const raw =
      platform === "googleplay"
        ? await fetchGooglePlayReviews(storeId, country, 200)
        : await fetchAppStoreReviews(storeId, country, 8);

    if (raw.length === 0) {
      await finishRun(runId, "completed", { inserted: 0, total: 0 }, "未获取到评论（可能是地区/接口限制）");
      return NextResponse.json({
        ok: true,
        inserted: 0,
        total: 0,
        note: platform === "googleplay" ? "Google Play 抓取依赖可选依赖，若为空可改用 App Store 或手动录入。" : "未获取到评论，请尝试其它地区或稍后重试。",
      });
    }

    const result = await ingestReviews({
      appName: meta.name,
      platform,
      storeId,
      country,
      category: meta.category,
      iconUrl: meta.iconUrl,
      reviews: raw,
    });
    await finishRun(
      runId,
      "completed",
      { inserted: result.inserted, total: result.total, app: meta.name },
      `从 ${meta.name} 采集到 ${result.total} 条评论，新增 ${result.inserted} 条`
    );
    return NextResponse.json({ ok: true, app: meta.name, ...result });
  } catch (err) {
    await finishRun(runId, "failed", {}, (err as Error).message);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
