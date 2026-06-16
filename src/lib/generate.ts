import Anthropic from "@anthropic-ai/sdk";
import type { Opportunity, ArtifactType } from "./types";
import { llmAvailable } from "./llm";

// Downstream generation: turn an opportunity card into actionable deliverables.
// Uses Claude when ANTHROPIC_API_KEY is set; otherwise produces solid templated
// Markdown from the card fields so the feature always works offline.

function context(o: Opportunity): string {
  const ev = o.evidence
    .slice(0, 6)
    .map((e) => `- [${e.appName} · ${e.rating}星] ${e.snippet}`)
    .join("\n");
  return [
    `机会标题：${o.title}`,
    `综合分：${Math.round(o.score.total)}/100（需求 ${o.score.demand} · 付费 ${o.score.payment} · 空白 ${o.score.gap} · 时机 ${o.score.timing}）`,
    `核心痛点：${o.painPoint}`,
    `目标用户：${o.targetUsers}`,
    `现有方案：${o.existingSolutions}`,
    `空白机会：${o.gaps}`,
    `建议形态：${o.suggestedFormat}`,
    `反向尽调：${o.reverseDiligence}`,
    `证据（${o.frequency} 条）：\n${ev}`,
  ].join("\n");
}

const INSTRUCTIONS: Record<ArtifactType, string> = {
  prd: `请基于以上机会，输出一份精炼可执行的 PRD（产品需求文档），用 Markdown：
## 一句话定位
## 目标用户与场景
## 核心问题（引用证据）
## MVP 功能范围（必须做 / 暂不做）
## 关键用户流程
## 成功指标
## 风险与依赖`,
  landing: `请基于以上机会，写一版高转化的落地页文案，用 Markdown：
## 主标题（Hero，1 句直击痛点）
## 副标题（1-2 句）
## 三个核心卖点（每个含小标题 + 一句话）
## 社会证明 / 信任要素建议
## 主 CTA 文案（2-3 个备选）
## FAQ（3 条）
语气面向目标用户，避免空话。`,
  tasks: `请基于以上机会，拆一份可直接开干的 MVP 任务清单，用 Markdown 复选框：
按「第 1 周 / 第 2 周 / 上线前」分组，每条任务可独立完成、动词开头、粒度到半天到一天。
末尾给出最小技术栈建议与一个最简数据模型。`,
  research: `请联网核查这个机会的真实性，做一份反向尽调，用 Markdown：
## 已存在的竞品（搜索后列举 3-5 个，含简述与定价模式）
## 它们为何没把这个痛点解决好（基于真实信息）
## 这是真机会还是伪机会（明确结论 + 理由）
## 给独立开发者的切入建议
## 需要进一步人工核实的点
务必基于搜索到的真实信息，不要编造竞品。`,
};

const SYSTEM = `你是「机会矿工」的资深产品与增长顾问，服务独立开发者。
输出务必：中文、Markdown、精炼、可执行、紧扣给定证据，不空谈。`;

// ── Templated fallbacks (offline) ────────────────────────────
function templatePRD(o: Opportunity): string {
  return `# PRD · ${o.title}

## 一句话定位
${o.suggestedFormat}

## 目标用户与场景
${o.targetUsers}

## 核心问题
${o.painPoint}

## MVP 功能范围
**必须做**
- 针对「${o.title}」的核心单点功能，把这一件事做到极致
- 最简可用的数据录入与结果展示

**暂不做**
- 大而全的配套功能（先验证核心价值）

## 空白与差异化
${o.gaps}

## 成功指标
- 首周留存、核心动作完成率、付费转化（已观察到付费意愿：${o.score.payment > 12 ? "较强" : "一般"}）

## 风险与依赖
${o.reverseDiligence}

> ⚙️ 模板生成。配置 ANTHROPIC_API_KEY 后可由 Claude 生成更深入的 PRD。`;
}

function templateLanding(o: Opportunity): string {
  return `# 落地页文案 · ${o.title}

## 主标题
别再为「${o.painPoint.slice(0, 24)}…」头疼

## 副标题
${o.suggestedFormat}

## 三个核心卖点
- **专注**：只做「${o.title}」，比综合工具更好用
- **轻量**：即开即用，不用学习成本
- **省心**：针对你最在意的痛点优化

## 主 CTA
- 立即免费试用
- 解决我的问题

## FAQ
- 和现有工具有什么不同？→ ${o.existingSolutions}
- 多少钱？→ ${o.score.payment > 12 ? "提供高级版，物有所值" : "核心功能免费"}
- 适合谁？→ ${o.targetUsers}

> ⚙️ 模板生成。配置 ANTHROPIC_API_KEY 后可由 Claude 生成更高转化的文案。`;
}

function templateTasks(o: Opportunity): string {
  return `# MVP 任务清单 · ${o.title}

## 第 1 周
- [ ] 明确核心用户流程（围绕「${o.title}」）
- [ ] 画最简界面原型
- [ ] 搭建项目骨架与数据模型

## 第 2 周
- [ ] 实现核心单点功能
- [ ] 接入最简数据录入/导入
- [ ] 内测并收集 5 个真实用户反馈

## 上线前
- [ ] 做一版落地页
- [ ] 埋点核心指标
- [ ] 准备冷启动渠道

## 最小技术栈建议
- 前端：单页应用或浏览器插件；后端：轻量 API + SQLite

> ⚙️ 模板生成。配置 ANTHROPIC_API_KEY 后可由 Claude 拆更细的任务。`;
}

function templateResearch(o: Opportunity): string {
  return `# 反向尽调 · ${o.title}

## 竞品概览
${o.existingSolutions}

## 为何还没被解决
${o.reverseDiligence}

## 切入建议
${o.gaps}

> ⚙️ 模板生成（未联网）。配置 ANTHROPIC_API_KEY 后将**联网搜索**真实竞品并核查机会真伪。`;
}

function template(o: Opportunity, type: ArtifactType): string {
  switch (type) {
    case "prd": return templatePRD(o);
    case "landing": return templateLanding(o);
    case "tasks": return templateTasks(o);
    case "research": return templateResearch(o);
  }
}

// ── LLM generation ───────────────────────────────────────────
async function generateLLM(o: Opportunity, type: ArtifactType): Promise<string | null> {
  try {
    const client = new Anthropic();
    const useWebSearch = type === "research";
    const req: Record<string, unknown> = {
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      output_config: { effort: type === "research" ? "high" : "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: `${context(o)}\n\n---\n\n${INSTRUCTIONS[type]}` }],
    };
    if (useWebSearch) req.tools = [{ type: "web_search_20260209", name: "web_search" }];

    let response = await client.messages.create(
      req as Anthropic.MessageCreateParamsNonStreaming & Record<string, unknown>
    );
    // Server-side tool loop (web search) may pause; resume up to a few times.
    let guard = 0;
    while (response.stop_reason === "pause_turn" && guard++ < 4) {
      response = await client.messages.create({
        ...(req as Anthropic.MessageCreateParamsNonStreaming & Record<string, unknown>),
        messages: [
          ...(req.messages as Anthropic.MessageParam[]),
          { role: "assistant", content: response.content },
        ],
      } as Anthropic.MessageCreateParamsNonStreaming & Record<string, unknown>);
    }
    if (response.stop_reason === "refusal") return null;
    const parts = response.content.filter((b) => b.type === "text") as { text: string }[];
    const text = parts.map((b) => b.text).join("\n").trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function generateArtifact(
  o: Opportunity,
  type: ArtifactType
): Promise<{ content: string; source: "llm" | "template" }> {
  if (llmAvailable()) {
    const llm = await generateLLM(o, type);
    if (llm) return { content: llm, source: "llm" };
  }
  return { content: template(o, type), source: "template" };
}
