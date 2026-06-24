import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/db/repo";
import { DEFAULT_NOTIFY, type NotificationSetting } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const notify = await getSetting<NotificationSetting>("notifications", DEFAULT_NOTIFY);
  // Don't echo the full URL back for safety; just whether it's set + a hint.
  const masked = notify.webhookUrl
    ? notify.webhookUrl.replace(/^(https?:\/\/[^/]+).*$/, "$1/…")
    : "";
  return NextResponse.json({ notify: { ...notify, webhookUrl: masked, hasWebhook: Boolean(notify.webhookUrl) } });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });
  const current = await getSetting<NotificationSetting>("notifications", DEFAULT_NOTIFY);
  const next: NotificationSetting = {
    ...current,
    // Only overwrite the URL when a non-empty value is provided (keeps existing).
    webhookUrl: typeof body.webhookUrl === "string" && body.webhookUrl.trim() ? body.webhookUrl.trim() : current.webhookUrl,
    alertThreshold:
      typeof body.alertThreshold === "number" ? Math.max(0, Math.min(100, body.alertThreshold)) : current.alertThreshold,
    alertEnabled: typeof body.alertEnabled === "boolean" ? body.alertEnabled : current.alertEnabled,
  };
  if (body.clearWebhook === true) next.webhookUrl = "";
  await setSetting("notifications", next);
  return NextResponse.json({ ok: true });
}
