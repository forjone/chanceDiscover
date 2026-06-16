import { NextRequest, NextResponse } from "next/server";
import { getOpportunity, listArtifacts, upsertArtifact } from "@/db/repo";
import { generateArtifact } from "@/lib/generate";
import type { ArtifactType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const VALID: ArtifactType[] = ["prd", "landing", "tasks", "research"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const opp = await getOpportunity(Number(params.id));
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
  const artifacts = await listArtifacts(opp.title);
  return NextResponse.json({ artifacts });
}

// Generate (or regenerate) a downstream artifact for this opportunity.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const opp = await getOpportunity(Number(params.id));
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const type = body?.type as ArtifactType;
  if (!VALID.includes(type)) {
    return NextResponse.json({ error: "invalid type" }, { status: 400 });
  }
  const { content, source } = await generateArtifact(opp, type);
  await upsertArtifact({ oppTitle: opp.title, type, content, source });
  return NextResponse.json({ ok: true, type, content, source });
}
