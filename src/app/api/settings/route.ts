import { NextRequest, NextResponse } from "next/server";
import { getSetting, setSetting } from "@/db/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MonitoringSetting {
  enabled: boolean;
  lastRunAt: string | null;
  lastResult: string | null;
}

const DEFAULT_MONITORING: MonitoringSetting = {
  enabled: false,
  lastRunAt: null,
  lastResult: null,
};

function configStatus() {
  const url = process.env.DATABASE_URL || "file:./data/miner.db";
  return {
    database: url.startsWith("file:") ? "本地文件 (SQLite)" : "远程 Turso",
    youtubeKey: Boolean(process.env.YOUTUBE_API_KEY),
    anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    cronSecret: Boolean(process.env.CRON_SECRET),
    appstoreCountry: process.env.APPSTORE_COUNTRY || "us",
    authEnabled: Boolean(process.env.APP_PASSWORD),
  };
}

export async function GET() {
  const monitoring = await getSetting<MonitoringSetting>("monitoring", DEFAULT_MONITORING);
  return NextResponse.json({ config: configStatus(), monitoring });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "expected { enabled: boolean }" }, { status: 400 });
  }
  const current = await getSetting<MonitoringSetting>("monitoring", DEFAULT_MONITORING);
  const next: MonitoringSetting = { ...current, enabled: body.enabled };
  await setSetting("monitoring", next);
  return NextResponse.json({ ok: true, monitoring: next });
}
