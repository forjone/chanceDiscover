import { NextResponse } from "next/server";
import { getSetting } from "@/db/repo";
import { sendWebhook, DEFAULT_NOTIFY, type NotificationSetting } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Send a test message to the configured webhook.
export async function POST() {
  const notify = await getSetting<NotificationSetting>("notifications", DEFAULT_NOTIFY);
  if (!notify.webhookUrl) {
    return NextResponse.json({ ok: false, error: "未配置 webhook 地址" }, { status: 400 });
  }
  const result = await sendWebhook(notify.webhookUrl, "✅ 机会矿工 webhook 测试成功——通知通道已打通。");
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
