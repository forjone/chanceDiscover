// ── Domain models for 机会矿工 / Opportunity Miner ──────────────────
// These mirror the persisted tables and the opportunity-card schema.

export type Platform = "appstore" | "googleplay";

export interface App {
  id: number;
  name: string;
  platform: Platform;
  storeId: string;
  country: string;
  category: string | null;
  iconUrl: string | null;
  createdAt: string;
}

export interface Review {
  id: number;
  appId: number;
  externalId: string | null;
  author: string | null;
  title: string | null;
  content: string;
  rating: number; // 1-5
  version: string | null;
  reviewDate: string | null;
  sentiment: number; // -1 .. 1
  payIntent: number; // 0 | 1
  createdAt: string;
  // joined
  appName?: string;
  platform?: Platform;
}

export interface PainCluster {
  id: number;
  runId: number | null;
  label: string;
  keywords: string[];
  summary: string;
  reviewCount: number;
  avgRating: number;
  avgSentiment: number;
  payIntentCount: number;
  createdAt: string;
}

export interface Evidence {
  appName: string;
  rating: number;
  snippet: string;
  date?: string | null;
}

export interface ScoreBreakdown {
  demand: number; // 0-25  权重 25%  需求强度
  payment: number; // 0-25  权重 30%  付费意愿
  gap: number; // 0-25  权重 30%  市场空白
  timing: number; // 0-25  权重 15%  时机/趋势
  total: number; // 0-100 weighted
}

export type OpportunityStatus = "new" | "watching" | "building" | "archived";

export interface Opportunity {
  id: number;
  runId: number | null;
  clusterId: number | null;
  title: string;
  painPoint: string;
  targetUsers: string;
  evidence: Evidence[];
  frequency: number;
  existingSolutions: string;
  gaps: string;
  suggestedFormat: string;
  reverseDiligence: string; // 反向尽调：竞品为何还没解决
  score: ScoreBreakdown;
  status: OpportunityStatus;
  notes: string; // 用户私人笔记
  tags: string[]; // 自定义标签
  createdAt: string;
}

export interface Activity {
  id: number;
  oppTitle: string;
  action: string;
  detail: string;
  member: string;
  createdAt: string;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface Trend {
  id: number;
  keyword: string;
  source: "youtube" | "reviews";
  momentum: number; // -1 .. 1 normalized trajectory
  dataPoints: TrendPoint[];
  updatedAt: string;
}

export type RunType = "manual" | "collect" | "pipeline";export type RunStatus = "running" | "completed" | "failed";

export interface Run {
  id: number;
  type: RunType;
  status: RunStatus;
  params: Record<string, unknown>;
  stats: Record<string, unknown>;
  log: string;
  startedAt: string;
  finishedAt: string | null;
}

// Downstream generated artifacts.
export type ArtifactType = "prd" | "landing" | "tasks" | "research";

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  prd: "PRD 需求文档",
  landing: "落地页文案",
  tasks: "MVP 任务清单",
  research: "联网反向尽调",
};

export interface Artifact {
  oppTitle: string;
  type: ArtifactType;
  content: string;
  source: "llm" | "template";
  createdAt: string;
}

// Scoring weights (sum to 1). Each dimension is scored 0-25 raw.
export const SCORE_WEIGHTS = {
  demand: 0.25,
  payment: 0.3,
  gap: 0.3,
  timing: 0.15,
} as const;

export const SCORE_LABELS: Record<keyof typeof SCORE_WEIGHTS, string> = {
  demand: "需求强度",
  payment: "付费意愿",
  gap: "市场空白",
  timing: "时机趋势",
};
