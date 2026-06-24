import { NextRequest, NextResponse } from "next/server";
import { generateWeeklyReport } from "@/lib/report";
import { getSetting } from "@/db/repo";
import { sendWebhook, DEFAULT_NOTIFY, type NotificationSetting } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: the weekly report as Markdown (download/view). POST: push it to webhook.
export async function GET(req: NextRequest) {
  const md = await generateWeeklyReport();
  if (req.nextUrl.searchParams.get("download") === "1") {
    return new NextResponse(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="weekly-report.md"`,
      },
    });
  }
  return NextResponse.json({ report: md });
}

export async function POST() {
  const notify = await getSetting<NotificationSetting>("notifications", DEFAULT_NOTIFY);
  if (!notify.webhookUrl) {
    return NextResponse.json({ ok: false, error: "未配置 webhook 地址" }, { status: 400 });
  }
  const md = await generateWeeklyReport();
  const result = await sendWebhook(notify.webhookUrl, md);
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
