import Link from "next/link";
import { AppWindow, MessageSquareText, Gem, Layers, ArrowRight } from "lucide-react";
import { dashboardStats } from "@/db/repo";
import { PageHeader, Stat, ScoreRing, TierBadge, EmptyState } from "@/components/ui";
import RunPipelineButton from "@/components/RunPipelineButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await dashboardStats();

  return (
    <>
      <PageHeader
        title="机会总览"
        subtitle="从评论到机会的全链路状态。"
        action={<RunPipelineButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="追踪应用" value={stats.apps} icon={<AppWindow className="h-4 w-4" />} hint="矿源数量" />
        <Stat label="评论样本" value={stats.reviews} icon={<MessageSquareText className="h-4 w-4" />} hint="已采集 / 录入" />
        <Stat label="痛点簇" value={stats.clusters} icon={<Layers className="h-4 w-4" />} hint="聚类结果" />
        <Stat label="机会卡片" value={stats.opportunities} icon={<Gem className="h-4 w-4" />} hint="已生成并打分" />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-rock-200">高分机会 Top 5</h2>
          <Link href="/opportunities" className="flex items-center gap-1 text-xs text-ore-400 hover:text-ore-300">
            查看全部 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {stats.topOpportunities.length === 0 ? (
          <EmptyState
            title="还没有挖掘出机会"
            hint="先到「评论数据」录入或采集评论，再点击「开始挖掘」，系统会自动聚类痛点、打分并生成机会卡片。"
            action={
              <Link href="/reviews" className="btn-primary mt-2">
                去添加评论
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {stats.topOpportunities.map((o, i) => (
              <Link
                key={o.id}
                href={`/opportunities/${o.id}`}
                className="card group flex items-center gap-4 p-4 transition-colors hover:border-ore-500/30"
              >
                <span className="w-6 text-center text-lg font-bold text-rock-600">{i + 1}</span>
                <ScoreRing total={o.score.total} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-rock-100 group-hover:text-ore-200">{o.title}</span>
                    <TierBadge total={o.score.total} />
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-rock-400">{o.painPoint}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <div className="text-xs text-rock-500">证据 {o.frequency} 条</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-rock-600 group-hover:text-ore-400" />
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 card p-5">
        <h3 className="text-sm font-semibold text-rock-200">挖掘流程</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "采集评论", d: "App Store RSS / Google Play 抓取，或手动粘贴。", href: "/reviews" },
            { n: "2", t: "聚类 + 打分", d: "提炼痛点簇，按需求/付费/空白/时机四维打分。", href: "/opportunities" },
            { n: "3", t: "趋势核验", d: "用真实热度轨迹校准时机，反向尽调避免误判。", href: "/trends" },
          ].map((s) => (
            <Link key={s.n} href={s.href} className="rounded-xl border border-rock-800 p-4 hover:border-ore-500/30">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ore-500/15 text-sm font-bold text-ore-300">
                {s.n}
              </div>
              <div className="mt-2 text-sm font-medium text-rock-100">{s.t}</div>
              <p className="mt-1 text-xs leading-relaxed text-rock-500">{s.d}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
