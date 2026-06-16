import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Target,
  Users,
  Boxes,
  Sparkles,
  ShieldQuestion,
  Quote,
  Layers,
} from "lucide-react";
import { getOpportunity } from "@/db/repo";
import { PageHeader, ScoreRing, ScoreBars, TierBadge, Stars } from "@/components/ui";
import StatusControl from "@/components/StatusControl";
import ExportButton from "@/components/ExportButton";
import OpportunityReviews from "@/components/OpportunityReviews";

export const dynamic = "force-dynamic";

export default async function OpportunityDetail({ params }: { params: { id: string } }) {
  const o = await getOpportunity(Number(params.id));
  if (!o) notFound();

  const Section = ({
    icon,
    title,
    children,
    tone = "rock",
  }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    tone?: "rock" | "ore";
  }) => (
    <div className={`card p-5 ${tone === "ore" ? "border-ore-500/30 bg-ore-500/[0.04]" : ""}`}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rock-200">
        <span className={tone === "ore" ? "text-ore-400" : "text-rock-400"}>{icon}</span>
        {title}
      </div>
      <div className="text-sm leading-relaxed text-rock-300">{children}</div>
    </div>
  );

  return (
    <>
      <Link href="/opportunities" className="mb-4 inline-flex items-center gap-1 text-sm text-rock-400 hover:text-rock-200">
        <ArrowLeft className="h-4 w-4" /> 返回机会列表
      </Link>

      <PageHeader
        title={o.title}
        subtitle={`机会 #${o.id} · 证据 ${o.frequency} 条`}
        action={<ExportButton opportunity={o} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score panel */}
        <div className="space-y-4 lg:col-span-1">
          <div className="card flex flex-col items-center gap-3 p-6">
            <ScoreRing total={o.score.total} size={120} />
            <TierBadge total={o.score.total} />
            <div className="w-full pt-2">
              <ScoreBars score={o.score} />
            </div>
          </div>
          <div className="card p-4">
            <div className="mb-2 text-xs text-rock-400">状态</div>
            <StatusControl id={o.id} status={o.status} />
          </div>
        </div>

        {/* Narrative */}
        <div className="space-y-4 lg:col-span-2">
          <Section icon={<Target className="h-4 w-4" />} title="核心痛点">
            {o.painPoint}
          </Section>
          <div className="grid gap-4 sm:grid-cols-2">
            <Section icon={<Users className="h-4 w-4" />} title="目标用户">
              {o.targetUsers}
            </Section>
            <Section icon={<Boxes className="h-4 w-4" />} title="现有方案">
              {o.existingSolutions}
            </Section>
            <Section icon={<Layers className="h-4 w-4" />} title="空白机会">
              {o.gaps}
            </Section>
            <Section icon={<Sparkles className="h-4 w-4" />} title="建议形态" tone="ore">
              {o.suggestedFormat}
            </Section>
          </div>

          <Section icon={<ShieldQuestion className="h-4 w-4" />} title="反向尽调 · 竞品为何还没解决">
            {o.reverseDiligence}
          </Section>
        </div>
      </div>

      {/* Evidence */}
      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rock-200">
          <Quote className="h-4 w-4 text-rock-400" /> 代表性证据
        </h2>
        {o.evidence.length === 0 ? (
          <p className="text-sm text-rock-500">无证据样本。</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {o.evidence.map((e, i) => (
              <div key={i} className="card p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-rock-400">
                  <span className="font-medium text-rock-300">{e.appName}</span>
                  <Stars rating={e.rating} />
                </div>
                <p className="text-sm leading-relaxed text-rock-300">“{e.snippet}”</p>
                {e.date && <div className="mt-2 text-[11px] text-rock-600">{e.date.slice(0, 10)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <OpportunityReviews id={o.id} />
    </>
  );
}
