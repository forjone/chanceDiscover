import type { Opportunity } from "./types";

// Heuristic tag suggestions derived from an opportunity's signals and theme.
// Offline and deterministic; users click to apply. (An LLM auto-tagger could
// later augment this without changing the call site.)

const THEME_RULES: { match: RegExp; tag: string }[] = [
  { match: /崩溃|闪退|crash|卡死|死机|stability/i, tag: "稳定性" },
  { match: /慢|卡顿|卡|性能|lag|slow|freeze|性能/i, tag: "性能" },
  { match: /搜索|search|查找/i, tag: "搜索" },
  { match: /离线|offline|没网/i, tag: "离线" },
  { match: /导出|export|导入|import/i, tag: "数据导出" },
  { match: /同步|sync|备份|backup/i, tag: "同步" },
  { match: /广告|ad\b|ads|去广/i, tag: "去广告" },
  { match: /订阅|付费|价格|定价|贵|subscri|price|pay/i, tag: "变现" },
  { match: /界面|ui|ux|设计|难用|复杂|usability/i, tag: "易用性" },
  { match: /通知|提醒|notification|reminder/i, tag: "通知" },
  { match: /隐私|权限|privacy|permission/i, tag: "隐私" },
];

export function suggestTags(o: Opportunity): string[] {
  const hay = `${o.title} ${o.painPoint} ${o.gaps}`.toLowerCase();
  const tags = new Set<string>();

  for (const { match, tag } of THEME_RULES) {
    if (match.test(hay)) tags.add(tag);
  }

  // Signal-based tags.
  if (o.score.payment >= 12) tags.add("付费意愿强");
  if (o.score.total >= 75) tags.add("高潜力");
  if (o.score.gap >= 18) tags.add("空白大");
  if (o.frequency >= 8) tags.add("声量大");

  // Drop ones already applied; cap suggestions.
  return [...tags].filter((t) => !o.tags.includes(t)).slice(0, 8);
}
