import type { Opportunity } from "./types";
import { SCORE_LABELS, SCORE_WEIGHTS } from "./types";

// Renders an opportunity card as portable Markdown for export / sharing.
export function opportunityToMarkdown(o: Opportunity): string {
  const dims = (["demand", "payment", "gap", "timing"] as const)
    .map((d) => `- ${SCORE_LABELS[d]}（${Math.round(SCORE_WEIGHTS[d] * 100)}%）：${o.score[d].toFixed(1)} / 25`)
    .join("\n");

  const evidence = o.evidence.length
    ? o.evidence
        .map((e) => `> ${"★".repeat(e.rating)} **${e.appName}**：${e.snippet}`)
        .join("\n>\n")
    : "_无证据样本_";

  return `# ${o.title}

**总分：${Math.round(o.score.total)} / 100** · 证据 ${o.frequency} 条

## 核心痛点
${o.painPoint}

## 目标用户
${o.targetUsers}

## 现有方案
${o.existingSolutions}

## 空白机会
${o.gaps}

## 建议形态
${o.suggestedFormat}

## 反向尽调 · 竞品为何还没解决
${o.reverseDiligence}

## 评分明细
${dims}

## 代表性证据
${evidence}

---
_由「机会矿工 · Opportunity Miner」生成_
`;
}
