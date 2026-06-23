import type { ScoreBreakdown, ScoreExplain } from "./types";
import { SCORE_WEIGHTS } from "./types";
import { detectPayIntent } from "./nlp";
import type { ClusterResult } from "./clustering";

// Four weighted dimensions, each scored 0-25 raw, combined into 0-100.
//   需求强度 demand   25% — comment frequency + emotional intensity
//   付费意愿 payment  30% — explicit purchasing-intent signals
//   市场空白 gap      30% — absence / inadequacy of current solutions
//   时机趋势 timing   15% — real heat trajectory (not AI speculation)

export interface ScoringContext {
  // 0..1 trend momentum sourced from real data (YouTube or review-volume slope).
  trendMomentum?: number;
  // Total reviews across the corpus, for relative frequency scaling.
  corpusSize?: number;
  // Whether the timing signal came from YouTube (vs review-volume fallback).
  youtubeKey?: boolean;
}

function clamp25(n: number): number {
  return Math.max(0, Math.min(25, n));
}

// 需求强度: how loud and frequent is the pain.
function scoreDemand(cluster: ClusterResult, ctx: ScoringContext): number {
  const corpus = Math.max(cluster.reviewCount, ctx.corpusSize || cluster.reviewCount);
  const frequencyShare = cluster.reviewCount / corpus; // 0..1
  // Saturating curve: 10+ mentions already strong.
  const volume = 1 - Math.exp(-cluster.reviewCount / 8); // 0..~1
  const intensity = Math.min(1, Math.abs(Math.min(0, cluster.avgSentiment)) * 1.4); // negativity
  const lowRating = Math.min(1, (5 - cluster.avgRating) / 4); // 1=worst
  const raw = (volume * 0.5 + intensity * 0.25 + lowRating * 0.15 + frequencyShare * 0.1) * 25;
  return clamp25(raw);
}

// 付费意愿: explicit signals that users would pay for a fix.
function scorePayment(cluster: ClusterResult): number {
  const share = cluster.reviewCount > 0 ? cluster.payIntentCount / cluster.reviewCount : 0;
  // Aggregate strength from the actual text of member reviews.
  let strengthSum = 0;
  for (const r of cluster.reviews) {
    strengthSum += detectPayIntent(`${r.title || ""} ${r.content}`).strength;
  }
  const avgStrength = cluster.reviewCount > 0 ? strengthSum / cluster.reviewCount : 0;
  // Any explicit signal at all is meaningful for an indie dev.
  const presence = cluster.payIntentCount > 0 ? 0.35 : 0;
  const raw = (presence + share * 0.4 + avgStrength * 0.6) * 25;
  return clamp25(raw);
}

// 市场空白: the worse the incumbents handle it, the bigger the gap.
// Proxy: pain concentrated in *otherwise* well-rated apps, plus persistent low
// ratings on this theme, implies incumbents have not solved it.
function scoreGap(cluster: ClusterResult): number {
  // Strong, unresolved negativity = real gap. avgRating low + many reviews.
  const unresolved = Math.min(1, (5 - cluster.avgRating) / 4);
  const persistence = 1 - Math.exp(-cluster.reviewCount / 10);
  // Distinct apps complaining about the same thing => category-wide gap.
  const distinctApps = new Set(cluster.reviews.map((r) => r.appName || r.appId)).size;
  const breadth = Math.min(1, distinctApps / 3);
  const raw = (unresolved * 0.45 + persistence * 0.3 + breadth * 0.25) * 25;
  return clamp25(raw);
}

// 时机趋势: real momentum, defaults to neutral-positive when unknown.
function scoreTiming(ctx: ScoringContext): number {
  const m = ctx.trendMomentum;
  if (m === undefined) return clamp25(12); // neutral when no real signal
  // m in -1..1 -> 0..25
  return clamp25(((m + 1) / 2) * 25);
}

export function scoreCluster(cluster: ClusterResult, ctx: ScoringContext = {}): ScoreBreakdown {
  const demand = scoreDemand(cluster, ctx);
  const payment = scorePayment(cluster);
  const gap = scoreGap(cluster);
  const timing = scoreTiming(ctx);
  // Weighted sum of 0-25 dims, scaled to 0-100.
  const weighted =
    demand * SCORE_WEIGHTS.demand +
    payment * SCORE_WEIGHTS.payment +
    gap * SCORE_WEIGHTS.gap +
    timing * SCORE_WEIGHTS.timing; // max 25
  const total = weighted * 4; // 0-100
  return {
    demand: round(demand),
    payment: round(payment),
    gap: round(gap),
    timing: round(timing),
    total: round(total),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

// Human-readable reasons behind each dimension, grounded in the same factors
// the score uses — so users can see *why* a number is what it is.
export function explainCluster(cluster: ClusterResult, ctx: ScoringContext = {}): ScoreExplain {
  const distinctApps = new Set(cluster.reviews.map((r) => r.appName || r.appId)).size;
  const payShare =
    cluster.reviewCount > 0 ? Math.round((cluster.payIntentCount / cluster.reviewCount) * 100) : 0;

  const demand: string[] = [
    `共 ${cluster.reviewCount} 条相关评论${cluster.reviewCount >= 8 ? "（声量充足）" : cluster.reviewCount >= 4 ? "（有一定声量）" : "（声量偏小，样本有限）"}`,
    `平均评分 ${cluster.avgRating.toFixed(1)} 星，情绪${cluster.avgSentiment < -0.3 ? "强烈负面" : cluster.avgSentiment < 0 ? "偏负面" : "中性"}`,
  ];

  const payment: string[] = [];
  if (cluster.payIntentCount > 0) {
    payment.push(`${cluster.payIntentCount} 条评论出现明确付费信号（占比 ${payShare}%）`);
    payment.push("用户已表达愿意为解决该问题付费——独立开发者的强变现信号");
  } else {
    payment.push("未捕捉到明确付费信号（如「愿意付费」「订阅」「太贵」等）");
    payment.push("可先以口碑获取用户，再用高级功能转化");
  }

  const gap: string[] = [
    `${distinctApps > 1 ? `${distinctApps} 个不同产品都有同类抱怨，是品类级空白` : "目前信号集中在单一产品，需确认是否为个例"}`,
    `该主题评分持续走低（均分 ${cluster.avgRating.toFixed(1)}），说明现有方案未让用户满意`,
  ];

  const timing: string[] = [];
  const m = ctx.trendMomentum;
  if (m === undefined) {
    timing.push("暂无真实趋势数据，按中性计分（拒绝 AI 臆测）");
  } else if (m > 0.1) {
    timing.push(`真实热度轨迹上升（动量 ${(m * 100).toFixed(0)}），痛点正在升温`);
  } else if (m < -0.1) {
    timing.push(`真实热度轨迹下降（动量 ${(m * 100).toFixed(0)}），痛点可能正在退潮`);
  } else {
    timing.push("真实热度轨迹平稳，无明显升降");
  }
  timing.push(ctx.youtubeKey ? "信号来源：YouTube 发布热度" : "信号来源：评论量轨迹（真实数据兜底）");

  return { demand, payment, gap, timing };
}

export function scoreTier(total: number): { label: string; tone: string } {
  if (total >= 75) return { label: "高潜力", tone: "ore" };
  if (total >= 55) return { label: "值得关注", tone: "emerald" };
  if (total >= 35) return { label: "观察中", tone: "sky" };
  return { label: "信号弱", tone: "rock" };
}
