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
  signature: string; // stable id for cross-run evolution tracking
}

// Single-linkage agglomerative clustering over the salient tokens of each review.
// Each review is represented by its top-K weighted tokens; a review joins the
// cluster containing its most-overlapping member. Robust on short bilingual
// (EN + 中文 bigram) text where sparse TF-IDF cosine collapses. Keyword
// extraction still uses TF-IDF. An embedding backend can later replace
// `salientTokens` + `overlap` without changing the rest of the pipeline.

const MIN_CLUSTER_SIZE = 2;
const TOP_K = 6; // salient tokens per review
const JOIN_THRESHOLD = 0.16; // min-size overlap to join a cluster (single-linkage)
const MERGE_THRESHOLD = 0.6; // keyword-set overlap above which clusters are deduped

type TokenSet = Set<string>;

function salientTokens(text: string, n = TOP_K): TokenSet {
  const counts = new Map<string, number>();
  for (const t of tokenize(text)) counts.set(t, (counts.get(t) || 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return new Set(sorted.slice(0, n).map(([t]) => t));
}

function overlap(a: TokenSet, b: TokenSet): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.min(a.size, b.size);
}

interface Bucket {
  sets: TokenSet[];
  items: Review[];
}

export function clusterReviews(reviews: Review[]): ClusterResult[] {
  const painful = reviews.filter((r) => r.rating <= 3 || r.sentiment < 0);
  const pool = painful.length >= MIN_CLUSTER_SIZE ? painful : reviews;
  if (pool.length === 0) return [];

  const sets = pool.map((r) => salientTokens(`${r.title || ""} ${r.content}`));

  // Online single-linkage: join the cluster whose nearest member overlaps most.
  const buckets: Bucket[] = [];
  for (let i = 0; i < pool.length; i++) {
    if (sets[i].size === 0) continue;
    let best: Bucket | null = null;
    let bestSim = JOIN_THRESHOLD;
    for (const bucket of buckets) {
      let m = 0;
      for (const ms of bucket.sets) {
        const sim = overlap(sets[i], ms);
        if (sim > m) m = sim;
      }
      if (m > bestSim) {
        best = bucket;
        bestSim = m;
      }
    }
    if (best) {
      best.sets.push(sets[i]);
      best.items.push(pool[i]);
    } else {
      buckets.push({ sets: [sets[i]], items: [pool[i]] });
    }
  }

  // Build keyword sets, then merge near-duplicate clusters (opportunity dedup).
  const built = buckets
    .filter((b) => b.items.length >= MIN_CLUSTER_SIZE)
    .map((b) => {
      const docs = b.items.map((r) => `${r.title || ""} ${r.content}`);
      const keywords = extractKeywords(docs, 6).map((k) => k.term);
      return { items: b.items, keywords, kwSet: new Set(keywords) };
    });

  for (let i = 0; i < built.length; i++) {
    for (let j = i + 1; j < built.length; j++) {
      if (overlap(built[i].kwSet, built[j].kwSet) > MERGE_THRESHOLD) {
        built[i].items.push(...built[j].items);
        const docs = built[i].items.map((r) => `${r.title || ""} ${r.content}`);
        built[i].keywords = extractKeywords(docs, 6).map((k) => k.term);
        built[i].kwSet = new Set(built[i].keywords);
        built.splice(j, 1);
        j--;
      }
    }
  }

  const clusters: ClusterResult[] = built.map(({ items, keywords }) => {
    const reviewCount = items.length;
    const avgRating = items.reduce((s, r) => s + r.rating, 0) / reviewCount;
    const avgSentiment = items.reduce((s, r) => s + r.sentiment, 0) / reviewCount;
    const payIntentCount = items.filter((r) => r.payIntent).length;
    const label = keywords.slice(0, 3).join(" · ") || "未命名痛点";
    return {
      label,
      keywords,
      summary: buildSummary(keywords, reviewCount, avgRating),
      reviewIds: items.map((r) => r.id),
      reviews: items,
      reviewCount,
      avgRating: round(avgRating),
      avgSentiment: round(avgSentiment),
      payIntentCount,
      signature: signatureOf(keywords),
    };
  });

  clusters.sort(
    (a, b) => b.reviewCount * (5 - b.avgRating) - a.reviewCount * (5 - a.avgRating)
  );
  return clusters;
}

// Stable signature from the leading keywords — lets us track the same pain
// theme across runs even as exact membership shifts.
export function signatureOf(keywords: string[]): string {
  return [...keywords.slice(0, 3)].sort().join("|") || "未命名";
}

function buildSummary(keywords: string[], count: number, avgRating: number): string {
  const kw = keywords.slice(0, 4).join("、");
  return `${count} 条评论围绕「${kw}」反复出现，平均评分 ${avgRating.toFixed(1)} 星，是一个集中且情绪强烈的痛点信号。`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
