import { NextResponse } from "next/server";
import { listStoreApps, createRun, finishRun } from "@/db/repo";
import { collectAppReviews } from "@/lib/collect";
import { runPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Phase 2 monitoring: re-collect every store-backed app, then re-mine.
export async function POST() {
  const apps = await listStoreApps();
  const runId = await createRun("collect", { kind: "refresh-all", apps: apps.length });
  const log: string[] = [];
  let totalInserted = 0;

  for (const app of apps) {
    try {
      const r = await collectAppReviews({
        platform: app.platform,
        storeId: app.storeId,
        country: app.country,
        appName: app.name,
        category: app.category,
        iconUrl: app.iconUrl,
      });
      totalInserted += r.inserted;
      log.push(`${app.name}: 新增 ${r.inserted} / 共 ${r.total}${r.note ? ` (${r.note})` : ""}`);
    } catch (e) {
      log.push(`${app.name}: 失败 ${(e as Error).message}`);
    }
  }

  await finishRun(runId, "completed", { apps: apps.length, inserted: totalInserted }, log.join("\n"));

  // Re-mine so opportunities and trends reflect the freshly collected reviews.
  let mined = { clusters: 0, opportunities: 0 };
  try {
    const result = await runPipeline();
    mined = { clusters: result.clusters, opportunities: result.opportunities };
  } catch (e) {
    log.push(`挖掘失败: ${(e as Error).message}`);
  }

  return NextResponse.json({
    ok: true,
    apps: apps.length,
    inserted: totalInserted,
    ...mined,
    log,
  });
}
