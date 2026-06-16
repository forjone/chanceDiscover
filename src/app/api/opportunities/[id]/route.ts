import { NextRequest, NextResponse } from "next/server";
import {
  getOpportunity,
  updateOpportunityStatus,
  updateOpportunityNotes,
  updateOpportunityTags,
  logActivity,
} from "@/db/repo";
import type { OpportunityStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: OpportunityStatus[] = ["new", "watching", "building", "archived"];
const STATUS_LABEL: Record<OpportunityStatus, string> = {
  new: "新发现", watching: "观察中", building: "在做了", archived: "已归档",
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const opp = await getOpportunity(Number(params.id));
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ opportunity: opp });
}

// Patch status / notes / tags, recording an activity entry per change.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const opp = await getOpportunity(id);
  if (!opp) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const member = req.cookies.get("miner_member")?.value || "匿名";
  let touched = false;

  if (typeof body.status === "string") {
    if (!VALID.includes(body.status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }
    if (body.status !== opp.status) {
      await updateOpportunityStatus(id, body.status);
      await logActivity({ oppTitle: opp.title, action: "状态", detail: `→ ${STATUS_LABEL[body.status as OpportunityStatus]}`, member });
    }
    touched = true;
  }
  if (typeof body.notes === "string") {
    await updateOpportunityNotes(id, body.notes);
    if (body.notes !== opp.notes) await logActivity({ oppTitle: opp.title, action: "笔记", detail: "更新", member });
    touched = true;
  }
  if (Array.isArray(body.tags)) {
    const tags = body.tags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 12);
    await updateOpportunityTags(id, tags);
    await logActivity({ oppTitle: opp.title, action: "标签", detail: tags.join("、") || "清空", member });
    touched = true;
  }
  if (!touched) return NextResponse.json({ error: "nothing to update" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
