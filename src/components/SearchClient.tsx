"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Gem, MessageSquareText } from "lucide-react";
import { TierBadge, Stars, EmptyState } from "@/components/ui";
import type { Opportunity, Review } from "@/lib/types";

export default function SearchClient() {
  const params = useSearchParams();
  const q = params.get("q") || "";
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    fetch(`/api/find?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => {
        setOpportunities(d.opportunities || []);
        setReviews(d.reviews || []);
      })
      .finally(() => setLoading(false));
  }, [q]);

  if (!q) return <EmptyState title="输入关键词搜索" hint="从左上角搜索框检索机会卡片与评论。" />;
  if (loading) return <p className="text-sm text-rock-500">搜索「{q}」中…</p>;

  const empty = opportunities.length === 0 && reviews.length === 0;
  if (empty) return <EmptyState title={`没有匹配「${q}」的结果`} hint="换个关键词试试。" />;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rock-200">
          <Gem className="h-4 w-4 text-ore-400" /> 机会卡片 ({opportunities.length})
        </h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-rock-500">无匹配机会。</p>
        ) : (
          <div className="space-y-2">
            {opportunities.map((o) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="card flex items-center gap-3 p-3 transition-colors hover:border-ore-500/30"
              >
                <span className="w-10 shrink-0 text-center text-lg font-bold text-rock-300">
                  {Math.round(o.score.total)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-rock-100">{o.title}</span>
                    <TierBadge total={o.score.total} />
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-rock-400">{o.painPoint}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rock-200">
          <MessageSquareText className="h-4 w-4 text-sky-400" /> 评论 ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-rock-500">无匹配评论。</p>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <div key={r.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-rock-300">{r.appName}</span>
                  <Stars rating={r.rating} />
                </div>
                {r.title && <div className="mt-1 text-sm text-rock-200">{r.title}</div>}
                <p className="mt-0.5 line-clamp-2 text-xs text-rock-400">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
