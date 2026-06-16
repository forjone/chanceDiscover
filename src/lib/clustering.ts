import type { Review } from "./types";
import { tokenize, extractKeywords } from "./nlp";

export interface ClusterResult {
  label: string;
  keywords: string[];
  summary: string;
  reviewIds: number[];
  reviews: Review[];
  reviewCount: number;
  avgRating: number;
  avgSentiment: number;
  payIntentCount: number;
}

// Greedy keyword-overlap clustering over pain-leaning reviews. Deterministic and
// offline. Each review joins the existing cluster it overlaps most with; otherwise
// it seeds a new cluster. A document is represented by its keyword token set.

const MIN_CLUSTER_SIZE = 2;
const OVERLAP_THRESHOLD = 0.18; // Jaccard-ish similarity needed to join a cluster

function topTokens(text: string, n = 6): Set<string> {
  const counts = new Map<string, number>();
  for (const t of tokenize(text)) counts.set(t, (counts.get(t) || 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return new Set(sorted.slice(0, n).map(([t]) => t));
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.min(a.size, b.size);
}

export function clusterReviews(reviews: Review[]): ClusterResult[] {
  // Focus on pain: low ratings or negative sentiment carry the signal.
  const painful = reviews.filter((r) => r.rating <= 3 || r.sentiment < 0);
  const pool = painful.length >= MIN_CLUSTER_SIZE ? painful : reviews;

  type Bucket = { centroid: Set<string>; items: Review[]; tokenSets: Set<string>[] };
  const buckets: Bucket[] = [];

  for (const r of pool) {
    const tokens = topTokens(`${r.title || ""} ${r.content}`);
    if (tokens.size === 0) continue;
    let best: Bucket | null = null;
    let bestSim = OVERLAP_THRESHOLD;
    for (const bucket of buckets) {
      const sim = similarity(tokens, bucket.centroid);
      if (sim > bestSim) {
        best = bucket;
        bestSim = sim;
      }
    }
    if (best) {
      best.items.push(r);
      best.tokenSets.push(tokens);
      // Recompute centroid as tokens shared by >=2 members (keeps it tight).
      const freq = new Map<string, number>();
      for (const ts of best.tokenSets) for (const t of ts) freq.set(t, (freq.get(t) || 0) + 1);
      best.centroid = new Set(
        [...freq.entries()].filter(([, c]) => c >= 2).map(([t]) => t)
      );
      if (best.centroid.size === 0) best.centroid = tokens;
    } else {
      buckets.push({ centroid: new Set(tokens), items: [r], tokenSets: [tokens] });
    }
  }

  const clusters: ClusterResult[] = [];
  for (const bucket of buckets) {
    if (bucket.items.length < MIN_CLUSTER_SIZE) continue;
    const docs = bucket.items.map((r) => `${r.title || ""} ${r.content}`);
    const keywords = extractKeywords(docs, 6).map((k) => k.term);
    const reviewCount = bucket.items.length;
    const avgRating = bucket.items.reduce((s, r) => s + r.rating, 0) / reviewCount;
    const avgSentiment = bucket.items.reduce((s, r) => s + r.sentiment, 0) / reviewCount;
    const payIntentCount = bucket.items.filter((r) => r.payIntent).length;
    const label = keywords.slice(0, 3).join(" · ") || "未命名痛点";
    const summary = buildSummary(keywords, reviewCount, avgRating);
    clusters.push({
      label,
      keywords,
      summary,
      reviewIds: bucket.items.map((r) => r.id),
      reviews: bucket.items,
      reviewCount,
      avgRating: round(avgRating),
      avgSentiment: round(avgSentiment),
      payIntentCount,
    });
  }

  // Rank by signal: volume × negativity.
  clusters.sort(
    (a, b) =>
      b.reviewCount * (5 - b.avgRating) - a.reviewCount * (5 - a.avgRating)
  );
  return clusters;
}

function buildSummary(keywords: string[], count: number, avgRating: number): string {
  const kw = keywords.slice(0, 4).join("、");
  return `${count} 条评论围绕「${kw}」反复出现，平均评分 ${avgRating.toFixed(1)} 星，是一个集中且情绪强烈的痛点信号。`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
