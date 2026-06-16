import Anthropic from "@anthropic-ai/sdk";
import type { ClusterResult } from "./clustering";
import type { GeneratedCard } from "./cards";

// Optional LLM enrichment. When ANTHROPIC_API_KEY is set, Claude rewrites the
// narrative fields of an opportunity card into richer, grounded prose. Scores and
// timing stay deterministic/heuristic — per the spec, those must reflect real
// data, never AI speculation. Falls back silently to the heuristic card when no
// key is configured or the call fails.

export function llmAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Narrative-only fields. The model never sets scores or evidence.
type CardNarrative = Pick<
  GeneratedCard,
  "title" | "painPoint" | "targetUsers" | "existingSolutions" | "gaps" | "suggestedFormat" | "reverseDiligence"
>;

const CARD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "8-20 字的机会标题，点明要做的单点工具" },
    painPoint: { type: "string", description: "核心痛点，2-3 句，必须基于给定证据" },
    targetUsers: { type: "string", description: "目标用户画像，1-2 句" },
    existingSolutions: { type: "string", description: "现有方案如何处理这个问题以及不足，1-2 句" },
    gaps: { type: "string", description: "尚未被满足的空白机会，1-2 句" },
    suggestedFormat: { type: "string", description: "建议的产品形态与变现方式，1-2 句" },
    reverseDiligence: {
      type: "string",
      description: "反向尽调：竞品为何还没解决，包含风险与需人工核实的点，2-3 句",
    },
  },
  required: [
    "title",
    "painPoint",
    "targetUsers",
    "existingSolutions",
    "gaps",
    "suggestedFormat",
    "reverseDiligence",
  ],
} as const;

const SYSTEM = `你是「机会矿工」的产品分析助手，面向独立开发者。
你的任务：基于一组真实的应用商店差评，把一个痛点簇提炼成结构化的产品机会卡片文案。
要求：
- 全部用简体中文。
- 严格基于给定证据，不要编造证据里没有的事实、数据或竞品。
- 语言精炼、可执行，像一个老练的产品人在做判断。
- 「反向尽调」必须真诚地分析竞品为何还没解决，并指出风险与需要人工核实之处——这是为了避免追逐伪机会。
- 不要输出分数或评分相关内容。`;

function buildPrompt(cluster: ClusterResult): string {
  const apps = [...new Set(cluster.reviews.map((r) => r.appName).filter(Boolean))];
  const evidence = cluster.reviews
    .slice(0, 15)
    .map((r, i) => `${i + 1}. [${r.appName || "未知应用"} · ${r.rating}星${r.payIntent ? " · 提及付费意愿" : ""}] ${(r.title ? r.title + "：" : "") + r.content}`)
    .join("\n");
  return [
    `痛点簇关键词：${cluster.keywords.join("、")}`,
    `涉及应用：${apps.join("、") || "（未标注）"}`,
    `评论数量：${cluster.reviewCount}，平均评分：${cluster.avgRating.toFixed(1)} 星，含付费意愿评论：${cluster.payIntentCount} 条`,
    ``,
    `代表性评论证据：`,
    evidence,
    ``,
    `请据此生成机会卡片文案。`,
  ].join("\n");
}

export async function enrichCard(cluster: ClusterResult): Promise<CardNarrative | null> {
  if (!llmAvailable()) return null;
  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: CARD_SCHEMA },
      },
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(cluster) }],
      // output_config is the canonical structured-output param; cast keeps us
      // resilient to SDK type drift across versions.
    } as Anthropic.MessageCreateParamsNonStreaming & Record<string, unknown>);

    if (response.stop_reason === "refusal") return null;
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return null;
    const parsed = JSON.parse(text.text) as CardNarrative;
    // Basic shape guard.
    if (!parsed.title || !parsed.painPoint || !parsed.reverseDiligence) return null;
    return parsed;
  } catch {
    return null;
  }
}
