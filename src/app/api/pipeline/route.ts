import { NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// LLM enrichment (when enabled) adds per-cluster latency; allow generous headroom.
export const maxDuration = 300;

// Runs the full mining pipeline on demand.
export async function POST() {
  try {
    const result = await runPipeline();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
