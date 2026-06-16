import { NextRequest, NextResponse } from "next/server";
import { listOpportunities } from "@/db/repo";
import { opportunityToMarkdown } from "@/lib/markdown";
import { SCORE_LABELS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bulk export of all opportunities as Markdown report, CSV, or JSON.
export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") || "md";
  const opportunities = await listOpportunities({ limit: 500 });

  if (format === "json") {
    return new NextResponse(JSON.stringify(opportunities, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="opportunities.json"`,
      },
    });
  }

  if (format === "csv") {
    const header = [
      "id", "title", "total", "demand", "payment", "gap", "timing",
      "frequency", "status", "painPoint",
    ];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""').replace(/\n/g, " ")}"`;
    const rows = opportunities.map((o) =>
      [
        o.id, o.title, o.score.total, o.score.demand, o.score.payment,
        o.score.gap, o.score.timing, o.frequency, o.status, o.painPoint,
      ].map(esc).join(",")
    );
    const csv = "﻿" + [header.join(","), ...rows].join("\n"); // BOM for Excel CJK
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="opportunities.csv"`,
      },
    });
  }

  // Markdown report (default).
  const head =
    `# 机会矿工 · 机会报告\n\n` +
    `> 共 ${opportunities.length} 个机会，按综合分排序。生成于 ${new Date().toISOString().slice(0, 10)}。\n\n` +
    `| # | 机会 | 综合 | ${Object.values(SCORE_LABELS).join(" | ")} | 证据 | 状态 |\n` +
    `| - | --- | --- | --- | --- | --- | --- | --- | --- |\n` +
    opportunities
      .map(
        (o, i) =>
          `| ${i + 1} | ${o.title} | ${Math.round(o.score.total)} | ${o.score.demand} | ${o.score.payment} | ${o.score.gap} | ${o.score.timing} | ${o.frequency} | ${o.status} |`
      )
      .join("\n") +
    `\n\n---\n\n`;
  const body = opportunities.map(opportunityToMarkdown).join("\n\n---\n\n");
  return new NextResponse(head + body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="opportunities.md"`,
    },
  });
}
