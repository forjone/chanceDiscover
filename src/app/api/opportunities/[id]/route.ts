import { NextRequest, NextResponse } from "next/server";
import { getOpportunity, updateOpportunityStatus } from "@/db/repo";
import type { OpportunityStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: OpportunityStatus[] = ["new", "watching", "building", "archived"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const opp = await getOpportunity(Number(params.id));
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ opportunity: opp });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const status = body?.status as OpportunityStatus;
  if (!VALID.includes(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }
  await updateOpportunityStatus(Number(params.id), status);
  return NextResponse.json({ ok: true });
}
