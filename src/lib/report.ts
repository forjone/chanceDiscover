import { dashboardStats, listOpportunities, listEvolution, listRuns } from "@/db/repo";

// Deterministic, offline weekly report generator. Summarises the current state
// of the mine into shareable Markdown (also used as the webhook alert body).
export async function generateWeeklyReport(): Promise<string> {
  const [stats, opps, evolution, runs] = await Promise.all([
    dashboardStats(),
    listOpportunities({ limit: 200 }),
    listEvolution(20),
    listRuns(10),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const top = opps.slice(0, 5);
  const rising = evolution.filter((e) => e.points.length >= 2 && e.delta > 0).slice(0, 5);
  const building = opps.filter((o) => o.status === "building");
  const watching = opps.filter((o) => o.status === "watching");

  const lines: string[] = [];
  lines.push(`# 机会矿工 · 周报（${today}）`);
  lines.push("");
  lines.push(
    `> 矿源 ${stats.apps} · 评论 ${stats.reviews} · 痛点簇 ${stats.clusters} · 机会 ${stats.opportunities}`
  );
  lines.push("");

  lines.push(`## 高分机会 Top ${top.length}`);
  if (top.length === 0) lines.push("_暂无机会，先采集评论并挖掘。_");
  else
    top.forEach((o, i) => {
      lines.push(
        `${i + 1}. **${o.title}** — ${Math.round(o.score.total)} 分（需求 ${o.score.demand} / 付费 ${o.score.payment} / 空白 ${o.score.gap} / 时机 ${o.score.timing}），证据 ${o.frequency} 条`
      );
    });
  lines.push("");

  if (rising.length) {
    lines.push("## 正在升温的痛点");
    rising.forEach((e) =>
      lines.push(`- **${e.label}** — 评论量 +${e.delta}（${e.points.length} 次运行），当前分 ${Math.round(e.latestScore)}`)
    );
    lines.push("");
  }

  if (building.length || watching.length) {
    lines.push("## 团队进展");
    if (building.length) lines.push(`- 在做了：${building.map((o) => o.title).join("、")}`);
    if (watching.length) lines.push(`- 观察中：${watching.map((o) => o.title).join("、")}`);
    lines.push("");
  }

  const recent = runs.filter((r) => r.type === "pipeline").slice(0, 3);
  if (recent.length) {
    lines.push("## 最近挖掘");
    recent.forEach((r) => {
      const o = (r.stats as { opportunities?: number }).opportunities ?? 0;
      lines.push(`- ${r.startedAt} · ${o} 个机会 · ${r.status}`);
    });
    lines.push("");
  }

  lines.push("---");
  lines.push("_由「机会矿工 · Opportunity Miner」自动生成_");
  return lines.join("\n");
}

// Compact one-line summary for alerts.
export function alertText(newOpps: { title: string; total: number }[]): string {
  const list = newOpps
    .map((o) => `• ${o.title}（${Math.round(o.total)} 分）`)
    .join("\n");
  return `🔔 机会矿工发现 ${newOpps.length} 个高潜力新机会：\n${list}`;
}
