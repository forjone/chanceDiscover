import { NextRequest, NextResponse } from "next/server";
import { ingestReviews } from "@/lib/ingest";
import { parseCsvReviews } from "@/lib/csv";
import { createRun, finishRun } from "@/db/repo";
import type { Platform } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Batch import reviews from CSV/TSV text (auto-detects delimiter + columns).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid JSON" }, { status: 400 });

  const appName: string = (body.appName || "CSV 导入").toString().trim();
  const platform: Platform = body.platform === "googleplay" ? "googleplay" : "appstore";
  const csv: string = (body.text || "").toString();
  const reviews = parseCsvReviews(csv);

  if (reviews.length === 0) {
    return NextResponse.json({ error: "未从 CSV 解析到任何评论（请确认含 content/评论 列或正确分隔符）" }, { status: 400 });
  }

  const storeId: string = (body.storeId || `csv-${slug(appName)}`).toString();
  const runId = await createRun("manual", { kind: "csv-import", appName, rows: reviews.length });
  try {
    const result = await ingestReviews({
      appName,
      platform,
      storeId,
      country: body.country || "import",
      reviews,
    });
    await finishRun(
      runId,
      "completed",
      { parsed: reviews.length, inserted: result.inserted },
      `CSV 导入「${appName}」：解析 ${reviews.length} 条，新增 ${result.inserted} 条`
    );
    return NextResponse.json({ ok: true, parsed: reviews.length, ...result });
  } catch (e) {
    await finishRun(runId, "failed", {}, (e as Error).message);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "csv";
}
