import { NextRequest, NextResponse } from "next/server";
import { listStoreApps, getSetting, setSetting, createRun, finishRun } from "@/db/repo";
import { collectAppReviews } from "@/lib/collect";
import { runPipeline } from "@/lib/pipeline";
import type { MonitoringSetting } from "../settings/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Scheduled monitoring endpoint (Phase 2). Point an external scheduler
// (Vercel Cron, GitHub Actions, crontab + curl) at this URL.
//   GET /api/cron?secret=...   or   Authorization: Bearer <CRON_SECRET>
// When CRON_SECRET is unset, the endpoint is open (suitable for local use only).
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization") || "";
  const bearer = header.replace(/^Bearer\s+/i, "");
  const qs = req.nextUrl.searchParams.get("secret") || "";
  return bearer === secret || qs === secret;
}

async function handle(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const monitoring = await getSetting<MonitoringSetting>("monitoring", {
    enabled: false,
    lastRunAt: null,
    lastResult: null,
  });
  // Respect the in-app toggle unless explicitly forced.
  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!monitoring.enabled && !force) {
    return NextResponse.json({ ok: true, skipped: "monitoring disabled" });
  }

  const apps = await listStoreApps();
  const runId = await createRun("collect", { kind: "cron", apps: apps.length });
  const log: string[] = [];
  let inserted = 0;
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
      inserted += r.inserted;
      log.push(`${app.name}: +${r.inserted}/${r.total}`);
    } catch (e) {
      log.push(`${app.name}: 失败 ${(e as Error).message}`);
    }
  }
  await finishRun(runId, "completed", { apps: apps.length, inserted }, log.join("\n"));

  let mined = { clusters: 0, opportunities: 0 };
  try {
    const result = await runPipeline();
    mined = { clusters: result.clusters, opportunities: result.opportunities };
  } catch (e) {
    log.push(`挖掘失败: ${(e as Error).message}`);
  }

  const result = `${apps.length} 矿源 · 新增 ${inserted} 评论 · ${mined.opportunities} 机会`;
  await setSetting("monitoring", {
    ...monitoring,
    lastRunAt: new Date().toISOString(),
    lastResult: result,
  });

  return NextResponse.json({ ok: true, apps: apps.length, inserted, ...mined });
}

export async function GET(req: NextRequest) {
  return handle(req);
}
export async function POST(req: NextRequest) {
  return handle(req);
}
