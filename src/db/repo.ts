import type { Row } from "@libsql/client";
import { query, db, ensureSchema } from "./client";
import type {
  App,
  Review,
  PainCluster,
  Opportunity,
  Trend,
  Run,
  Platform,
  OpportunityStatus,
} from "@/lib/types";

// ── Row mappers ──────────────────────────────────────────────
function toApp(r: Row): App {
  return {
    id: Number(r.id),
    name: String(r.name),
    platform: String(r.platform) as Platform,
    storeId: String(r.store_id),
    country: String(r.country),
    category: r.category ? String(r.category) : null,
    iconUrl: r.icon_url ? String(r.icon_url) : null,
    createdAt: String(r.created_at),
  };
}

function toReview(r: Row): Review {
  return {
    id: Number(r.id),
    appId: Number(r.app_id),
    externalId: r.external_id ? String(r.external_id) : null,
    author: r.author ? String(r.author) : null,
    title: r.title ? String(r.title) : null,
    content: String(r.content),
    rating: Number(r.rating),
    version: r.version ? String(r.version) : null,
    reviewDate: r.review_date ? String(r.review_date) : null,
    sentiment: Number(r.sentiment),
    payIntent: Number(r.pay_intent),
    createdAt: String(r.created_at),
    appName: r.app_name ? String(r.app_name) : undefined,
    platform: r.app_platform ? (String(r.app_platform) as Platform) : undefined,
  };
}

function toOpportunity(r: Row): Opportunity {
  return {
    id: Number(r.id),
    runId: r.run_id !== null ? Number(r.run_id) : null,
    clusterId: r.cluster_id !== null ? Number(r.cluster_id) : null,
    title: String(r.title),
    painPoint: String(r.pain_point),
    targetUsers: String(r.target_users),
    evidence: JSON.parse(String(r.evidence || "[]")),
    frequency: Number(r.frequency),
    existingSolutions: String(r.existing_solutions),
    gaps: String(r.gaps),
    suggestedFormat: String(r.suggested_format),
    reverseDiligence: String(r.reverse_diligence),
    score: {
      demand: Number(r.score_demand),
      payment: Number(r.score_payment),
      gap: Number(r.score_gap),
      timing: Number(r.score_timing),
      total: Number(r.score_total),
    },
    status: String(r.status) as OpportunityStatus,
    notes: r.notes !== undefined && r.notes !== null ? String(r.notes) : "",
    createdAt: String(r.created_at),
  };
}

function toCluster(r: Row): PainCluster {
  return {
    id: Number(r.id),
    runId: r.run_id !== null ? Number(r.run_id) : null,
    label: String(r.label),
    keywords: JSON.parse(String(r.keywords || "[]")),
    summary: String(r.summary),
    reviewCount: Number(r.review_count),
    avgRating: Number(r.avg_rating),
    avgSentiment: Number(r.avg_sentiment),
    payIntentCount: Number(r.pay_intent_count),
    createdAt: String(r.created_at),
  };
}

function toTrend(r: Row): Trend {
  return {
    id: Number(r.id),
    keyword: String(r.keyword),
    source: String(r.source) as Trend["source"],
    momentum: Number(r.momentum),
    dataPoints: JSON.parse(String(r.data_points || "[]")),
    updatedAt: String(r.updated_at),
  };
}

function toRun(r: Row): Run {
  return {
    id: Number(r.id),
    type: String(r.type) as Run["type"],
    status: String(r.status) as Run["status"],
    params: JSON.parse(String(r.params || "{}")),
    stats: JSON.parse(String(r.stats || "{}")),
    log: String(r.log),
    startedAt: String(r.started_at),
    finishedAt: r.finished_at ? String(r.finished_at) : null,
  };
}

// ── Apps ─────────────────────────────────────────────────────
export async function upsertApp(input: {
  name: string;
  platform: Platform;
  storeId: string;
  country?: string;
  category?: string | null;
  iconUrl?: string | null;
}): Promise<App> {
  const country = input.country || "us";
  await query(
    `INSERT INTO apps (name, platform, store_id, country, category, icon_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(platform, store_id, country)
     DO UPDATE SET name = excluded.name, category = COALESCE(excluded.category, apps.category),
                   icon_url = COALESCE(excluded.icon_url, apps.icon_url)`,
    [input.name, input.platform, input.storeId, country, input.category ?? null, input.iconUrl ?? null]
  );
  const res = await query(
    `SELECT * FROM apps WHERE platform = ? AND store_id = ? AND country = ?`,
    [input.platform, input.storeId, country]
  );
  return toApp(res.rows[0]);
}

export async function listApps(): Promise<App[]> {
  const res = await query(
    `SELECT a.*, (SELECT COUNT(*) FROM reviews r WHERE r.app_id = a.id) AS review_count
     FROM apps a ORDER BY a.created_at DESC`
  );
  return res.rows.map((r) => ({ ...toApp(r), reviewCount: Number(r.review_count) }) as App & { reviewCount: number });
}

export async function getApp(id: number): Promise<App | null> {
  const res = await query(`SELECT * FROM apps WHERE id = ?`, [id]);
  return res.rows[0] ? toApp(res.rows[0]) : null;
}

// Store-backed apps (re-collectable). Excludes manual-entry sources.
export async function listStoreApps(): Promise<App[]> {
  const res = await query(
    `SELECT * FROM apps WHERE store_id NOT LIKE 'manual-%' ORDER BY created_at DESC`
  );
  return res.rows.map(toApp);
}

export async function deleteApp(id: number): Promise<void> {
  // reviews cascade via FK; clear any orphaned generated artifacts afterwards.
  await query(`DELETE FROM apps WHERE id = ?`, [id]);
}

// ── Reviews ──────────────────────────────────────────────────
export async function insertReview(input: {
  appId: number;
  externalId?: string | null;
  author?: string | null;
  title?: string | null;
  content: string;
  rating: number;
  version?: string | null;
  reviewDate?: string | null;
  sentiment: number;
  payIntent: number;
}): Promise<number> {
  const res = await query(
    `INSERT INTO reviews (app_id, external_id, author, title, content, rating, version, review_date, sentiment, pay_intent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(app_id, external_id) DO NOTHING`,
    [
      input.appId,
      input.externalId ?? null,
      input.author ?? null,
      input.title ?? null,
      input.content,
      input.rating,
      input.version ?? null,
      input.reviewDate ?? null,
      input.sentiment,
      input.payIntent,
    ]
  );
  return Number(res.lastInsertRowid ?? 0);
}

export async function listReviews(opts: { appId?: number; limit?: number } = {}): Promise<Review[]> {
  const limit = opts.limit ?? 200;
  const where = opts.appId ? `WHERE r.app_id = ?` : "";
  const args = opts.appId ? [opts.appId, limit] : [limit];
  const res = await query(
    `SELECT r.*, a.name AS app_name, a.platform AS app_platform
     FROM reviews r JOIN apps a ON a.id = r.app_id
     ${where} ORDER BY r.created_at DESC LIMIT ?`,
    args
  );
  return res.rows.map(toReview);
}

export async function allReviewsForAnalysis(): Promise<Review[]> {
  const res = await query(
    `SELECT r.*, a.name AS app_name, a.platform AS app_platform
     FROM reviews r JOIN apps a ON a.id = r.app_id`
  );
  return res.rows.map(toReview);
}

export async function countReviews(): Promise<number> {
  const res = await query(`SELECT COUNT(*) AS c FROM reviews`);
  return Number(res.rows[0].c);
}

// ── Runs ─────────────────────────────────────────────────────
export async function createRun(type: Run["type"], params: Record<string, unknown>): Promise<number> {
  const res = await query(
    `INSERT INTO runs (type, status, params) VALUES (?, 'running', ?)`,
    [type, JSON.stringify(params)]
  );
  return Number(res.lastInsertRowid);
}

export async function finishRun(
  id: number,
  status: Run["status"],
  stats: Record<string, unknown>,
  log: string
): Promise<void> {
  await query(
    `UPDATE runs SET status = ?, stats = ?, log = ?, finished_at = datetime('now') WHERE id = ?`,
    [status, JSON.stringify(stats), log, id]
  );
}

export async function listRuns(limit = 30): Promise<Run[]> {
  const res = await query(`SELECT * FROM runs ORDER BY started_at DESC LIMIT ?`, [limit]);
  return res.rows.map(toRun);
}

// ── Clusters ─────────────────────────────────────────────────
export async function insertCluster(
  runId: number,
  c: {
    label: string;
    keywords: string[];
    summary: string;
    reviewCount: number;
    avgRating: number;
    avgSentiment: number;
    payIntentCount: number;
    reviewIds: number[];
  }
): Promise<number> {
  const res = await query(
    `INSERT INTO pain_clusters (run_id, label, keywords, summary, review_count, avg_rating, avg_sentiment, pay_intent_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      runId,
      c.label,
      JSON.stringify(c.keywords),
      c.summary,
      c.reviewCount,
      c.avgRating,
      c.avgSentiment,
      c.payIntentCount,
    ]
  );
  const clusterId = Number(res.lastInsertRowid);
  await ensureSchema();
  const batch = c.reviewIds.map((rid) => ({
    sql: `INSERT OR IGNORE INTO cluster_reviews (cluster_id, review_id) VALUES (?, ?)`,
    args: [clusterId, rid] as (string | number)[],
  }));
  if (batch.length) await db().batch(batch, "write");
  return clusterId;
}

export async function listClusters(limit = 50): Promise<PainCluster[]> {
  const res = await query(`SELECT * FROM pain_clusters ORDER BY review_count DESC LIMIT ?`, [limit]);
  return res.rows.map(toCluster);
}

// ── Opportunities ────────────────────────────────────────────
export async function insertOpportunity(
  runId: number | null,
  clusterId: number | null,
  o: import("@/lib/cards").GeneratedCard,
  status: OpportunityStatus = "new",
  notes = ""
): Promise<number> {
  const res = await query(
    `INSERT INTO opportunities
      (run_id, cluster_id, title, pain_point, target_users, evidence, frequency,
       existing_solutions, gaps, suggested_format, reverse_diligence,
       score_demand, score_payment, score_gap, score_timing, score_total, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      runId,
      clusterId,
      o.title,
      o.painPoint,
      o.targetUsers,
      JSON.stringify(o.evidence),
      o.frequency,
      o.existingSolutions,
      o.gaps,
      o.suggestedFormat,
      o.reverseDiligence,
      o.score.demand,
      o.score.payment,
      o.score.gap,
      o.score.timing,
      o.score.total,
      status,
      notes,
    ]
  );
  return Number(res.lastInsertRowid);
}

// Snapshot human-set status + notes before a re-run, keyed by a stable signature
// (title) so annotations survive pipeline regeneration.
export interface OpportunityMeta {
  status: OpportunityStatus;
  notes: string;
}
export async function snapshotOpportunityMeta(): Promise<Record<string, OpportunityMeta>> {
  const res = await query(
    `SELECT title, status, notes FROM opportunities WHERE status != 'new' OR notes != ''`
  );
  const map: Record<string, OpportunityMeta> = {};
  for (const r of res.rows) {
    map[String(r.title)] = {
      status: String(r.status) as OpportunityStatus,
      notes: r.notes !== undefined && r.notes !== null ? String(r.notes) : "",
    };
  }
  return map;
}

// Member reviews behind an opportunity's cluster (the raw evidence).
export async function getClusterReviews(clusterId: number): Promise<Review[]> {
  const res = await query(
    `SELECT r.*, a.name AS app_name, a.platform AS app_platform
     FROM cluster_reviews cr
     JOIN reviews r ON r.id = cr.review_id
     JOIN apps a ON a.id = r.app_id
     WHERE cr.cluster_id = ?
     ORDER BY r.rating ASC, r.sentiment ASC`,
    [clusterId]
  );
  return res.rows.map(toReview);
}

export type OpportunitySort = "total" | "demand" | "payment" | "gap" | "timing" | "frequency" | "recent";

const SORT_COLUMN: Record<OpportunitySort, string> = {
  total: "score_total DESC",
  demand: "score_demand DESC",
  payment: "score_payment DESC",
  gap: "score_gap DESC",
  timing: "score_timing DESC",
  frequency: "frequency DESC",
  recent: "created_at DESC",
};

export async function listOpportunities(
  opts: { status?: OpportunityStatus; sort?: OpportunitySort; limit?: number } = {}
): Promise<Opportunity[]> {
  const limit = opts.limit ?? 100;
  const where = opts.status ? `WHERE status = ?` : "";
  const args = opts.status ? [opts.status, limit] : [limit];
  const orderBy = SORT_COLUMN[opts.sort || "total"] || SORT_COLUMN.total;
  const res = await query(
    `SELECT * FROM opportunities ${where} ORDER BY ${orderBy}, created_at DESC LIMIT ?`,
    args
  );
  return res.rows.map(toOpportunity);
}

export async function getOpportunity(id: number): Promise<Opportunity | null> {
  const res = await query(`SELECT * FROM opportunities WHERE id = ?`, [id]);
  return res.rows[0] ? toOpportunity(res.rows[0]) : null;
}

export async function updateOpportunityStatus(id: number, status: OpportunityStatus): Promise<void> {
  await query(`UPDATE opportunities SET status = ? WHERE id = ?`, [status, id]);
}

export async function updateOpportunityNotes(id: number, notes: string): Promise<void> {
  await query(`UPDATE opportunities SET notes = ? WHERE id = ?`, [notes, id]);
}

// Full-text-ish search over opportunities (title / pain / users / gaps).
export async function searchOpportunities(q: string, limit = 30): Promise<Opportunity[]> {
  const like = `%${q}%`;
  const res = await query(
    `SELECT * FROM opportunities
     WHERE title LIKE ? OR pain_point LIKE ? OR target_users LIKE ? OR gaps LIKE ?
     ORDER BY score_total DESC LIMIT ?`,
    [like, like, like, like, limit]
  );
  return res.rows.map(toOpportunity);
}

export async function clearGeneratedArtifacts(): Promise<void> {
  // Fresh pipeline run: drop prior clusters & opportunities (reviews/apps kept).
  await query(`DELETE FROM opportunities`);
  await query(`DELETE FROM cluster_reviews`);
  await query(`DELETE FROM pain_clusters`);
}

// ── Trends ───────────────────────────────────────────────────
export async function upsertTrend(t: {
  keyword: string;
  source: Trend["source"];
  momentum: number;
  dataPoints: { date: string; value: number }[];
}): Promise<void> {
  await query(
    `INSERT INTO trends (keyword, source, momentum, data_points, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(keyword, source) DO UPDATE SET
       momentum = excluded.momentum, data_points = excluded.data_points, updated_at = datetime('now')`,
    [t.keyword, t.source, t.momentum, JSON.stringify(t.dataPoints)]
  );
}

export async function listTrends(limit = 30): Promise<Trend[]> {
  const res = await query(`SELECT * FROM trends ORDER BY momentum DESC LIMIT ?`, [limit]);
  return res.rows.map(toTrend);
}

// ── Settings (key/value JSON) ────────────────────────────────
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const res = await query(`SELECT value FROM settings WHERE key = ?`, [key]);
  if (!res.rows[0]) return fallback;
  try {
    return JSON.parse(String(res.rows[0].value)) as T;
  } catch {
    return fallback;
  }
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    [key, JSON.stringify(value)]
  );
}

// ── Search ───────────────────────────────────────────────────
export async function searchReviews(q: string, limit = 30): Promise<Review[]> {
  const like = `%${q}%`;
  const res = await query(
    `SELECT r.*, a.name AS app_name, a.platform AS app_platform
     FROM reviews r JOIN apps a ON a.id = r.app_id
     WHERE r.content LIKE ? OR r.title LIKE ?
     ORDER BY r.rating ASC LIMIT ?`,
    [like, like, limit]
  );
  return res.rows.map(toReview);
}

// ── Artifacts (downstream generation) ────────────────────────
import type { Artifact, ArtifactType } from "@/lib/types";

export async function listArtifacts(oppTitle: string): Promise<Artifact[]> {
  const res = await query(
    `SELECT * FROM artifacts WHERE opp_title = ? ORDER BY created_at DESC`,
    [oppTitle]
  );
  return res.rows.map((r) => ({
    oppTitle: String(r.opp_title),
    type: String(r.type) as ArtifactType,
    content: String(r.content),
    source: String(r.source) as Artifact["source"],
    createdAt: String(r.created_at),
  }));
}

export async function upsertArtifact(a: {
  oppTitle: string;
  type: ArtifactType;
  content: string;
  source: Artifact["source"];
}): Promise<void> {
  await query(
    `INSERT INTO artifacts (opp_title, type, content, source, created_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(opp_title, type) DO UPDATE SET
       content = excluded.content, source = excluded.source, created_at = datetime('now')`,
    [a.oppTitle, a.type, a.content, a.source]
  );
}

// ── Data management ──────────────────────────────────────────
export async function clearAllData(): Promise<void> {
  await query(`DELETE FROM opportunities`);
  await query(`DELETE FROM cluster_reviews`);
  await query(`DELETE FROM pain_clusters`);
  await query(`DELETE FROM trends`);
  await query(`DELETE FROM reviews`);
  await query(`DELETE FROM apps`);
  await query(`DELETE FROM runs`);
  await query(`DELETE FROM artifacts`);
}

// Score distribution buckets for the dashboard.
export async function scoreDistribution(): Promise<{ tier: string; count: number }[]> {
  await ensureSchema();
  const res = await query(`SELECT score_total AS s FROM opportunities`);
  const buckets = { 高潜力: 0, 值得关注: 0, 观察中: 0, 信号弱: 0 };
  for (const r of res.rows) {
    const s = Number(r.s);
    if (s >= 75) buckets["高潜力"]++;
    else if (s >= 55) buckets["值得关注"]++;
    else if (s >= 35) buckets["观察中"]++;
    else buckets["信号弱"]++;
  }
  return Object.entries(buckets).map(([tier, count]) => ({ tier, count }));
}

// ── Dashboard stats ──────────────────────────────────────────
export async function dashboardStats() {
  await ensureSchema();
  const [apps, reviews, opps, clusters, top] = await Promise.all([
    query(`SELECT COUNT(*) AS c FROM apps`),
    query(`SELECT COUNT(*) AS c FROM reviews`),
    query(`SELECT COUNT(*) AS c FROM opportunities`),
    query(`SELECT COUNT(*) AS c FROM pain_clusters`),
    query(`SELECT * FROM opportunities ORDER BY score_total DESC LIMIT 5`),
  ]);
  return {
    apps: Number(apps.rows[0].c),
    reviews: Number(reviews.rows[0].c),
    opportunities: Number(opps.rows[0].c),
    clusters: Number(clusters.rows[0].c),
    topOpportunities: top.rows.map(toOpportunity),
  };
}
