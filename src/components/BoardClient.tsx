"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, GripVertical } from "lucide-react";
import { TierBadge } from "@/components/ui";
import type { Opportunity, OpportunityStatus } from "@/lib/types";

const COLUMNS: { status: OpportunityStatus; label: string; tone: string }[] = [
  { status: "new", label: "新发现", tone: "border-rock-700" },
  { status: "watching", label: "观察中", tone: "border-sky-500/40" },
  { status: "building", label: "在做了", tone: "border-ore-500/40" },
  { status: "archived", label: "已归档", tone: "border-rock-800" },
];

export default function BoardClient() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<number | null>(null);
  const [over, setOver] = useState<OpportunityStatus | null>(null);

  async function load() {
    const d = await fetch("/api/opportunities").then((r) => r.json());
    setOpps(d.opportunities || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function move(id: number, status: OpportunityStatus) {
    const opp = opps.find((o) => o.id === id);
    if (!opp || opp.status === status) return;
    // Optimistic.
    setOpps((list) => list.map((o) => (o.id === id ? { ...o, status } : o)));
    await fetch(`/api/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  if (loading) return <p className="text-sm text-rock-500">加载中…</p>;
  if (opps.length === 0)
    return <p className="text-sm text-rock-500">还没有机会卡片，先去「机会卡片」挖掘。</p>;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {COLUMNS.map((col) => {
        const items = opps.filter((o) => o.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col.status);
            }}
            onDragLeave={() => setOver((s) => (s === col.status ? null : s))}
            onDrop={() => {
              if (dragId != null) move(dragId, col.status);
              setDragId(null);
              setOver(null);
            }}
            className={`rounded-2xl border ${col.tone} bg-rock-900/40 p-3 transition-colors ${
              over === col.status ? "ring-2 ring-ore-500/40" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-rock-200">{col.label}</span>
              <span className="text-xs text-rock-500">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((o) => (
                <div
                  key={o.id}
                  draggable
                  onDragStart={() => setDragId(o.id)}
                  onDragEnd={() => setDragId(null)}
                  className={`group rounded-xl border border-rock-800 bg-rock-950/60 p-3 ${
                    dragId === o.id ? "opacity-40" : "hover:border-ore-500/30"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-rock-600" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tabular-nums text-rock-300">
                          {Math.round(o.score.total)}
                        </span>
                        <TierBadge total={o.score.total} />
                      </div>
                      <Link
                        href={`/opportunities/${o.id}`}
                        className="mt-1 block truncate text-sm text-rock-100 hover:text-ore-200"
                      >
                        {o.title}
                      </Link>
                      {o.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {o.tags.map((t) => (
                            <span key={t} className="rounded-full bg-rock-800 px-2 py-0.5 text-[10px] text-rock-300">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-rock-800 px-3 py-6 text-center text-xs text-rock-600">
                  拖拽机会到这里
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
