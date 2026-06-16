import { NextRequest, NextResponse } from "next/server";
import { getOpportunity, updateOpportunityStatus, updateOpportunityNotes } from "@/db/repo";
import type { OpportunityStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: OpportunityStatus[] = ["new", "watching", "building", "archived"];

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const opp = await getOpportunity(Number(params.id));
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ opportunity: opp });
}

// Patch status and/or notes.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  let touched = false;
  if (typeof body.status === "string") {
    if (!VALID.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    await updateOpportunityStatus(id, body.status);
    touched = true;
  }
  if (typeof body.notes === "string") {
    await updateOpportunityNotes(id, body.notes);
    touched = true;
  }
  if (!touched) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
