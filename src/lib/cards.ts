import type { Evidence, Opportunity } from "./types";
import type { ClusterResult } from "./clustering";
import { scoreCluster, type ScoringContext } from "./scoring";

// Generates a structured opportunity card from a pain cluster. Text is
// data-driven and templated so it works offline; an LLM can later replace
// `narrate*` helpers for richer prose without changing the schema.

function pickEvidence(cluster: ClusterResult, max = 4): Evidence[] {
  // Prefer the most negative / pay-intent reviews as representative evidence.
  const ranked = [...cluster.reviews].sort((a, b) => {
    const sa = (a.payIntent ? 1 : 0) + (3 - a.sentiment);
    const sb = (b.payIntent ? 1 : 0) + (3 - b.sentiment);
    return sb - sa;
  });
  return ranked.slice(0, max).map((r) => ({
    appName: r.appName || `App #${r.appId}`,
    rating: r.rating,
    snippet: truncate(r.content, 180),
    date: r.reviewDate,
  }));
}

function narrateTitle(cluster: ClusterResult): string {
  const kw = cluster.keywords.slice(0, 2).join("与");
  return kw ? `解决「${kw}」的痛点工具` : "未命名机会";
}

function narratePain(cluster: ClusterResult): string {
  const kw = cluster.keywords.slice(0, 4).join("、");
  return `用户在使用同类产品时，反复因为「${kw}」感到受挫——${cluster.reviewCount} 条相关评论、平均仅 ${cluster.avgRating.toFixed(1)} 星，说明这是尚未被满足的核心需求。`;
}

function narrateTargetUsers(cluster: ClusterResult): string {
  const apps = [...new Set(cluster.reviews.map((r) => r.appName).filter(Boolean))];
  const who = apps.length ? `${apps.slice(0, 3).join("、")} 等产品的现有用户` : "同品类的活跃用户";
  return `${who}：他们已经在为这类工具付出时间或金钱，却被现有方案的短板挡住。`;
}

function narrateExisting(cluster: ClusterResult): string {
  const apps = [...new Set(cluster.reviews.map((r) => r.appName).filter(Boolean))];
  if (apps.length === 0) return "现有方案以大型综合工具为主，未针对此痛点做专门优化。";
  return `${apps.slice(0, 4).join("、")} 等产品覆盖了基础场景，但在该痛点上评分集中走低，说明它们的处理方式并不让用户满意。`;
}

function narrateGaps(cluster: ClusterResult): string {
  const kw = cluster.keywords.slice(0, 3).join("、");
  return `空白点：针对「${kw}」缺少轻量、专注、即开即用的方案。用户要么忍受、要么在多个工具间来回切换，没有人把这件事做到极致。`;
}

function narrateFormat(cluster: ClusterResult, payIntent: boolean): string {
  const kw = cluster.keywords[0] || "该痛点";
  const monetize = payIntent ? "用户已表现出明确付费意愿，可采用一次性买断或订阅。" : "可先免费获取口碑，再以高级功能转化。";
  return `建议形态：一个聚焦「${kw}」的单点工具（移动端或浏览器插件），把这一件事做到比综合型产品更好。${monetize}`;
}

// 反向尽调：竞品为何还没解决——critical for avoiding false positives.
function narrateReverseDiligence(cluster: ClusterResult): string {
  const distinctApps = new Set(cluster.reviews.map((r) => r.appName || r.appId)).size;
  const reasons: string[] = [];
  if (distinctApps > 1)
    reasons.push("多家竞品都有同类抱怨，说明这是结构性难题而非个别产品疏漏，存在被忽视的真实空间。");
  else reasons.push("目前信号集中在单一产品，需确认是该产品个例还是品类共性。");
  if (cluster.payIntentCount === 0)
    reasons.push("尚未捕捉到明确付费信号，大厂可能因为变现路径不清而搁置——这既是风险也是独立开发者的机会。");
  else reasons.push("已有付费意愿信号，大厂未做很可能是因为它太「小」不值得占用其路线图，正适合独立开发者切入。");
  reasons.push("仍需人工核实：确认抱怨不是来自已被新版本修复的旧版本，避免追逐已消失的痛点。");
  return reasons.join(" ");
}

function truncate(s: string, n: number): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export interface GeneratedCard {
  title: string;
  painPoint: string;
  targetUsers: string;
  evidence: Evidence[];
  frequency: number;
  existingSolutions: string;
  gaps: string;
  suggestedFormat: string;
  reverseDiligence: string;
  score: Opportunity["score"];
}

export function generateCard(cluster: ClusterResult, ctx: ScoringContext = {}): GeneratedCard {
  const score = scoreCluster(cluster, ctx);
  const payIntent = cluster.payIntentCount > 0;
  return {
    title: narrateTitle(cluster),
    painPoint: narratePain(cluster),
    targetUsers: narrateTargetUsers(cluster),
    evidence: pickEvidence(cluster),
    frequency: cluster.reviewCount,
    existingSolutions: narrateExisting(cluster),
    gaps: narrateGaps(cluster),
    suggestedFormat: narrateFormat(cluster, payIntent),
    reverseDiligence: narrateReverseDiligence(cluster),
    score,
  };
}
