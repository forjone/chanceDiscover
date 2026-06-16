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

// Vector-space (TF-IDF + cosine) clustering over pain-leaning reviews, followed
// by a merge pass that collapses near-duplicate clusters. Deterministic and
// offline; an embedding provider can later replace `vectorize` without changing
// the rest of the pipeline.

const MIN_CLUSTER_SIZE = 2;
const JOIN_THRESHOLD = 0.12; // single-linkage cosine needed to join a cluster
const MERGE_THRESHOLD = 0.45; // centroid cosine above which two clusters are deduped

type Vec = Map<string, number>;

function cosine(a: Vec, b: Vec): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, w] of small) {
    const o = large.get(t);
    if (o) dot += w * o;
  }
  if (dot === 0) return 0;
  let na = 0;
  for (const w of a.values()) na += w * w;
  let nb = 0;
  for (const w of b.values()) nb += w * w;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function addInto(target: Vec, src: Vec) {
  for (const [t, w] of src) target.set(t, (target.get(t) || 0) + w);
}

// Build TF-IDF vectors for a corpus of documents.
function vectorize(docs: string[][]): Vec[] {
  const df = new Map<string, number>();
  for (const toks of docs) {
    for (const t of new Set(toks)) df.set(t, (df.get(t) || 0) + 1);
  }
  const N = Math.max(1, docs.length);
  return docs.map((toks) => {
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    const v: Vec = new Map();
    for (const [t, c] of tf) {
      const idf = Math.log(1 + N / (df.get(t) || 1));
      v.set(t, c * idf);
    }
    return v;
  });
}

interface Bucket {
  vectors: Vec[]; // member vectors (single-linkage)
  centroidSum: Vec; // running sum, for the merge pass
  items: Review[];
}

function centroid(b: Bucket): Vec {
  const c: Vec = new Map();
  const n = b.items.length;
  for (const [t, w] of b.centroidSum) c.set(t, w / n);
  return c;
}

export function clusterReviews(reviews: Review[]): ClusterResult[] {
  const painful = reviews.filter((r) => r.rating <= 3 || r.sentiment < 0);
  const pool = painful.length >= MIN_CLUSTER_SIZE ? painful : reviews;
  if (pool.length === 0) return [];

  const docs = pool.map((r) => tokenize(`${r.title || ""} ${r.content}`));
  const vectors = vectorize(docs);

  // Online single-linkage: a review joins the cluster with the most similar
  // member (not the centroid, which blobs on short bilingual text).
  const buckets: Bucket[] = [];
  for (let i = 0; i < pool.length; i++) {
    const vec = vectors[i];
    if (vec.size === 0) continue;
    let best: Bucket | null = null;
    let bestSim = JOIN_THRESHOLD;
    for (const bucket of buckets) {
      let m = 0;
      for (const mv of bucket.vectors) {
        const sim = cosine(vec, mv);
        if (sim > m) m = sim;
      }
      if (m > bestSim) {
        best = bucket;
        bestSim = m;
      }
    }
    if (best) {
      best.vectors.push(vec);
      addInto(best.centroidSum, vec);
      best.items.push(pool[i]);
    } else {
      buckets.push({ vectors: [vec], centroidSum: new Map(vec), items: [pool[i]] });
    }
  }

  // Merge pass: collapse near-duplicate clusters (opportunity dedup at source).
  for (let i = 0; i < buckets.length; i++) {
    for (let j = i + 1; j < buckets.length; j++) {
      if (cosine(centroid(buckets[i]), centroid(buckets[j])) > MERGE_THRESHOLD) {
        buckets[i].vectors.push(...buckets[j].vectors);
        addInto(buckets[i].centroidSum, buckets[j].centroidSum);
        buckets[i].items.push(...buckets[j].items);
        buckets.splice(j, 1);
        j--;
      }
    }
  }

  const clusters: ClusterResult[] = [];
  for (const bucket of buckets) {
    if (bucket.items.length < MIN_CLUSTER_SIZE) continue;
    const memberDocs = bucket.items.map((r) => `${r.title || ""} ${r.content}`);
    const keywords = extractKeywords(memberDocs, 6).map((k) => k.term);
    const reviewCount = bucket.items.length;
    const avgRating = bucket.items.reduce((s, r) => s + r.rating, 0) / reviewCount;
    const avgSentiment = bucket.items.reduce((s, r) => s + r.sentiment, 0) / reviewCount;
    const payIntentCount = bucket.items.filter((r) => r.payIntent).length;
    const label = keywords.slice(0, 3).join(" · ") || "未命名痛点";
    clusters.push({
      label,
      keywords,
      summary: buildSummary(keywords, reviewCount, avgRating),
      reviewIds: bucket.items.map((r) => r.id),
      reviews: bucket.items,
      reviewCount,
      avgRating: round(avgRating),
      avgSentiment: round(avgSentiment),
      payIntentCount,
      signature: signatureOf(keywords),
    });
  }

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
