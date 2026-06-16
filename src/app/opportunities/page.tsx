import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listOpportunities, listTags, type OpportunitySort } from "@/db/repo";
import { PageHeader, ScoreRing, ScoreBars, TierBadge, EmptyState } from "@/components/ui";
import RunPipelineButton from "@/components/RunPipelineButton";
import ExportMenu from "@/components/ExportMenu";
import type { OpportunityStatus } from "@/lib/types";

const SORTS: { value: OpportunitySort; label: string }[] = [
  { value: "total", label: "综合分" },
  { value: "demand", label: "需求强度" },
  { value: "payment", label: "付费意愿" },
  { value: "gap", label: "市场空白" },
  { value: "timing", label: "时机趋势" },
  { value: "frequency", label: "证据量" },
  { value: "recent", label: "最新" },
];

export const dynamic = "force-dynamic";

const FILTERS: { value: string; label: string }[] = [
  { value: "", label: "全部" },
  { value: "new", label: "新发现" },
  { value: "watching", label: "观察中" },
  { value: "building", label: "在做了" },
  { value: "archived", label: "已归档" },
];

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: { status?: string; sort?: string; tag?: string };
}) {
  const status = (searchParams.status || "") as OpportunityStatus | "";
  const sort = (searchParams.sort || "total") as OpportunitySort;
  const tag = searchParams.tag || "";
  const [opportunities, allTags] = await Promise.all([
    listOpportunities({ status: status || undefined, sort, tag: tag || undefined, limit: 200 }),
    listTags(),
  ]);

  const qs = (next: { status?: string; sort?: string; tag?: string }) => {
    const s = next.status ?? status;
    const so = next.sort ?? sort;
    const tg = next.tag ?? tag;
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (so && so !== "total") p.set("sort", so);
    if (tg) p.set("tag", tg);
    const str = p.toString();
    return str ? `/opportunities?${str}` : "/opportunities";
  };

  return (
    <>
      <PageHeader
        title="机会卡片"
        subtitle="按总分排序的产品机会，每张卡片都带证据与反向尽调。"
        action={
          opportunities.length > 0 ? (
            <div className="flex items-center gap-4">
              <ExportMenu />
              <RunPipelineButton label="重新挖掘" />
            </div>
          ) : (
            <RunPipelineButton label="重新挖掘" />
          )
        }
      />

      <div className="mb-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (status || "") === f.value;
          return (
            <Link
              key={f.value}
              href={qs({ status: f.value })}
              className={`chip ${active ? "border-ore-500/40 bg-ore-500/10 text-ore-300" : ""}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="text-xs text-rock-500">排序</span>
        {SORTS.map((s) => {
          const active = sort === s.value;
          return (
            <Link
              key={s.value}
              href={qs({ sort: s.value })}
              className={`chip ${active ? "border-sky-500/40 bg-sky-500/10 text-sky-300" : ""}`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>

      {allTags.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs text-rock-500">标签</span>
          {tag && (
            <Link href={qs({ tag: "" })} className="chip border-rock-700 text-rock-400">
              全部
            </Link>
          )}
          {allTags.map((t) => (
            <Link
              key={t.tag}
              href={qs({ tag: t.tag })}
              className={`chip ${tag === t.tag ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : ""}`}
            >
              {t.tag} <span className="text-rock-600">{t.count}</span>
            </Link>
          ))}
        </div>
      )}

      {opportunities.length === 0 ? (
        <EmptyState
          title="暂无机会卡片"
          hint="录入或采集评论后点击「重新挖掘」即可生成。"
          action={
            <Link href="/reviews" className="btn-primary mt-2">
              去添加评论
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {opportunities.map((o) => (
            <Link
              key={o.id}
              href={`/opportunities/${o.id}`}
              className="card group flex flex-col gap-4 p-5 transition-colors hover:border-ore-500/30"
            >
              <div className="flex items-start gap-4">
                <ScoreRing total={o.score.total} size={60} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <TierBadge total={o.score.total} />
                    <span className="text-[11px] text-rock-500">证据 {o.frequency} 条</span>
                  </div>
                  <h3 className="mt-1.5 truncate font-semibold text-rock-100 group-hover:text-ore-200">
                    {o.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-rock-400">{o.painPoint}</p>
                  {o.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {o.tags.map((t) => (
                        <span key={t} className="rounded-full bg-rock-800 px-2 py-0.5 text-[10px] text-rock-300">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <ScoreBars score={o.score} compact />
              <div className="flex items-center justify-end text-xs text-ore-400 opacity-0 transition-opacity group-hover:opacity-100">
                查看详情 <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
