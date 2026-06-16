"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Stars } from "@/components/ui";
import type { Review } from "@/lib/types";

// Lazily reveals the raw evidence reviews behind an opportunity's cluster.
export default function OpportunityReviews({ id }: { id: number }) {
  const [open, setOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || reviews) return;
    setLoading(true);
    fetch(`/api/opportunities/${id}/reviews`)
      .then((r) => r.json())
      .then((d) => setReviews(d.reviews || []))
      .finally(() => setLoading(false));
  }, [open, reviews, id]);

  return (
    <div className="card mt-6 p-5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-semibold text-rock-200"
      >
        <span>全部来源评论{reviews ? ` (${reviews.length})` : ""}</span>
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-4 space-y-2">
          {loading && <p className="text-sm text-rock-500">加载中…</p>}
          {reviews && reviews.length === 0 && <p className="text-sm text-rock-500">无关联评论。</p>}
          {reviews?.map((r) => (
            <div key={r.id} className="rounded-xl border border-rock-800 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-medium text-rock-300">{r.appName}</span>
                <div className="flex shrink-0 items-center gap-2">
                  {r.payIntent === 1 && <span className="chip border-ore-500/30 text-ore-300">付费意愿</span>}
                  <Stars rating={r.rating} />
                </div>
              </div>
              {r.title && <div className="mt-1 text-sm text-rock-200">{r.title}</div>}
              <p className="mt-0.5 text-xs leading-relaxed text-rock-400">{r.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
